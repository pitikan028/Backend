<#
.SYNOPSIS
    ตรวจสอบว่าระบบ Chokchai ทำงานครบทุกส่วนจริงหรือไม่

.DESCRIPTION
    ยิงคำขอจริงไล่ตั้งแต่หน้าเว็บ → API → ฐานข้อมูล → ระบบหลังบ้าน
    แล้วสรุปผลเป็นตาราง ผ่าน/ไม่ผ่าน

    ข้อมูลทดสอบที่สร้างระหว่างทางจะถูกลบทิ้งตอนจบ จึงรันซ้ำได้ไม่รก

.EXAMPLE
    .\scripts\smoke-test.ps1
    .\scripts\smoke-test.ps1 -BaseUrl http://localhost:8080
#>

param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$AdminEmail = 'admin@chokchai.local',
    [string]$AdminPassword = 'Admin@1234'
)

$ErrorActionPreference = 'Stop'
$api = "$BaseUrl/api"
$results = @()
$testEmail = "smoke.test@example.com"

# ใช้ชื่อ property เป็นอังกฤษ เพราะ Windows PowerShell 5.1 ใช้อักษรไทยเป็นชื่อ property ไม่ได้
# ส่วนหัวตารางภาษาไทยไปกำหนดตอน Format-Table ท้ายสคริปต์แทน
# Windows PowerShell 5.1 โยน WebException ส่วน PowerShell 7 โยน HttpResponseException
# ตัวนี้ดึง status code ออกมาได้ทั้งสองแบบ
function Get-HttpStatus {
    param($ErrorRecord)
    $response = $ErrorRecord.Exception.Response
    if ($null -eq $response) { return $null }
    try { return [int]$response.StatusCode } catch { return $null }
}

# เรียก endpoint ที่ "ควรถูกปฏิเสธ" แล้วยืนยันว่าได้ status code ตามที่คาด
function Assert-Rejected {
    param(
        [string]$Url,
        [int]$Expected,
        [hashtable]$Headers,
        [string]$Method = 'GET',
        [string]$Body
    )
    $params = @{ Uri = $Url; Method = $Method; ErrorAction = 'Stop' }
    if ($Headers) { $params.Headers = $Headers }
    if ($Body) { $params.Body = $Body; $params.ContentType = 'application/json' }

    $succeeded = $false
    try {
        Invoke-RestMethod @params | Out-Null
        $succeeded = $true
    } catch {
        $code = Get-HttpStatus $_
        if ($null -eq $code) { throw }
        if ($code -ne $Expected) { throw "ได้ HTTP $code ควรเป็น $Expected" }
        return "ถูกปฏิเสธด้วย HTTP $code"
    }
    if ($succeeded) { throw "เรียกสำเร็จทั้งที่ควรถูกปฏิเสธด้วย HTTP $Expected — เป็นช่องโหว่" }
}

function Test-Step {
    param([string]$Name, [scriptblock]$Body)
    try {
        $detail = & $Body
        $script:results += [pscustomobject]@{ Result = 'ผ่าน'; Check = $Name; Detail = $detail }
    } catch {
        $script:results += [pscustomobject]@{ Result = 'ไม่ผ่าน'; Check = $Name; Detail = $_.Exception.Message }
    }
}

Write-Host "`nตรวจสอบระบบที่ $BaseUrl`n" -ForegroundColor Cyan

# ---------- 1. Container ----------
Test-Step 'Container ทำงานครบ 3 ตัว' {
    $up = docker compose -f "$PSScriptRoot\..\docker-compose.yml" ps --format '{{.Name}} {{.Status}}' 2>$null
    $count = ($up | Where-Object { $_ -match 'Up' } | Measure-Object).Count
    if ($count -lt 3) { throw "ทำงานอยู่ $count ตัว (ต้องเป็น 3)" }
    "web, api, postgres ทำงานอยู่"
}

# ---------- 2. หน้าเว็บ ----------
foreach ($page in @('/', '/activities.html', '/admin.html')) {
    Test-Step "หน้าเว็บ $page" {
        $r = Invoke-WebRequest "$BaseUrl$page" -UseBasicParsing -TimeoutSec 15
        if ($r.StatusCode -ne 200) { throw "HTTP $($r.StatusCode)" }
        "HTTP 200 · $([math]::Round($r.RawContentLength/1KB,1)) KB"
    }
}

# ---------- 3. API สาธารณะ ----------
Test-Step 'API health' {
    $h = Invoke-RestMethod "$api/health" -TimeoutSec 15
    if ($h.status -ne 'ok') { throw "status = $($h.status)" }
    "ฐานข้อมูล: $($h.database)"
}

$activities = $null
Test-Step 'ดึงรายการกิจกรรม' {
    $script:activities = (Invoke-RestMethod "$api/activities").data
    if ($activities.Count -lt 1) { throw 'ไม่มีกิจกรรมในฐานข้อมูล — ยังไม่ได้ seed?' }
    "$($activities.Count) กิจกรรม"
}

Test-Step 'ดึงรีวิว' {
    $rv = Invoke-RestMethod "$api/reviews"
    "$($rv.data.Count) รีวิว · คะแนนเฉลี่ย $($rv.meta.average_rating)"
}

Test-Step 'ดึงคำถามที่พบบ่อย' {
    "$((Invoke-RestMethod "$api/faqs").data.Count) ข้อ"
}

# ---------- 4. ที่ว่าง ----------
$slug = 'elephant-bathing'
$date = (Get-Date).AddDays(60).ToString('yyyy-MM-dd')
$before = $null

Test-Step "เช็คที่ว่าง ($slug $date)" {
    $script:before = (Invoke-RestMethod "$api/activities/$slug/availability?date=$date").data
    "เหลือ $($before.remaining) จาก $($before.capacity) ที่"
}

# ---------- 5. จองจริง ----------
$booking = $null
Test-Step 'สร้างการจอง (2 ผู้ใหญ่ + 1 เด็ก)' {
    $body = @{
        activity_slug = $slug; booking_date = $date
        adults = 2; children = 1; infants = 0
        first_name = 'ทดสอบ'; last_name = 'ระบบ'
        phone = '081-111-1111'; email = $testEmail
        contact_app = 'Line'; pickup_type = 'hotel'
        accept_terms = $true
    } | ConvertTo-Json
    $script:booking = (Invoke-RestMethod "$api/bookings" -Method Post -Body $body -ContentType 'application/json; charset=utf-8').data
    "รหัส $($booking.booking_ref) · ยอด $($booking.total_amount) บาท"
}

Test-Step 'ยอดเงินคำนวณถูกต้อง' {
    $act = $activities | Where-Object slug -eq $slug
    $expect = 2 * $act.adult_price + 1 * $act.child_price
    if ($booking.total_amount -ne $expect) { throw "ได้ $($booking.total_amount) ควรเป็น $expect" }
    "$expect บาท (2x$($act.adult_price) + 1x$($act.child_price))"
}

Test-Step 'ที่ว่างลดลง 3 ที่' {
    $after = (Invoke-RestMethod "$api/activities/$slug/availability?date=$date").data
    if ($after.remaining -ne ($before.remaining - 3)) { throw "เหลือ $($after.remaining) ควรเป็น $($before.remaining - 3)" }
    "$($before.remaining) → $($after.remaining)"
}

Test-Step 'ค้นหาการจองด้วยรหัส + อีเมล' {
    $f = (Invoke-RestMethod "$api/bookings/$($booking.booking_ref)?email=$testEmail").data
    "พบ: $($f.activity.name_th) วันที่ $($f.booking_date)"
}

Test-Step 'อีเมลไม่ตรง ต้องเข้าไม่ได้' {
    Assert-Rejected -Url "$api/bookings/$($booking.booking_ref)?email=wrong@example.com" -Expected 404
}

Test-Step 'ราคาที่ส่งมาจากเบราว์เซอร์ต้องไม่ถูกใช้' {
    $body = @{
        activity_slug = $slug; booking_date = $date
        adults = 1; children = 0; infants = 0
        total_amount = 1; adult_price = 1
        first_name = 'ทดสอบ'; last_name = 'ราคา'
        phone = '081-111-1111'; email = $testEmail
        accept_terms = $true
    } | ConvertTo-Json
    $b = (Invoke-RestMethod "$api/bookings" -Method Post -Body $body -ContentType 'application/json; charset=utf-8').data
    $act = $activities | Where-Object slug -eq $slug
    if ($b.total_amount -ne $act.adult_price) { throw "ได้ $($b.total_amount) ควรเป็น $($act.adult_price)" }
    "ส่งราคา 1 บาทไป ระบบคิด $($b.total_amount) บาทตามฐานข้อมูล"
}

# ---------- 6. ฟอร์มติดต่อ ----------
Test-Step 'ส่งคำถามผ่านฟอร์มติดต่อ' {
    $body = @{ contact = $testEmail; message = 'ข้อความทดสอบจาก smoke-test' } | ConvertTo-Json
    (Invoke-RestMethod "$api/inquiries" -Method Post -Body $body -ContentType 'application/json; charset=utf-8').data.message
}

# ---------- 7. ระบบหลังบ้าน ----------
$headers = $null
Test-Step 'แอดมินเข้าสู่ระบบ' {
    $body = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $a = (Invoke-RestMethod "$api/auth/login" -Method Post -Body $body -ContentType 'application/json').data
    $script:headers = @{ Authorization = "Bearer $($a.token)" }
    "เข้าสู่ระบบเป็น $($a.user.name)"
}

Test-Step 'เรียก API แอดมินโดยไม่มี token ต้องไม่ได้' {
    Assert-Rejected -Url "$api/admin/stats" -Expected 401
}

Test-Step 'ดูสถิติ dashboard' {
    $s = (Invoke-RestMethod "$api/admin/stats" -Headers $headers).data
    "จองทั้งหมด $($s.bookings.total) · รอยืนยัน $($s.bookings.by_status.pending) · รายได้ $($s.revenue_thb) บาท"
}

Test-Step 'เปลี่ยนสถานะการจองเป็นยืนยันแล้ว' {
    $list = Invoke-RestMethod "$api/admin/bookings?q=$testEmail" -Headers $headers
    $id = $list.data[0].id
    $u = (Invoke-RestMethod "$api/admin/bookings/$id" -Method Patch -Headers $headers `
          -Body (@{ status = 'confirmed' } | ConvertTo-Json) -ContentType 'application/json').data
    "$($u.booking_ref) → $($u.status)"
}

Test-Step 'ข้ามลำดับสถานะต้องถูกปฏิเสธ' {
    $list = Invoke-RestMethod "$api/admin/bookings?q=$testEmail&status=pending" -Headers $headers
    if ($list.data.Count -eq 0) { return 'ไม่มีรายการ pending ให้ทดสอบ (ข้าม)' }
    # pending ต้องผ่าน confirmed ก่อน จะกระโดดไป completed ไม่ได้
    Assert-Rejected -Url "$api/admin/bookings/$($list.data[0].id)" -Method 'PATCH' -Headers $headers `
        -Body (@{ status = 'completed' } | ConvertTo-Json) -Expected 409
}

# ---------- ล้างข้อมูลทดสอบ ----------
Test-Step 'ล้างข้อมูลทดสอบ' {
    docker exec chokchai-postgres psql -U chokchai -d chokchai -q -c `
        "DELETE FROM bookings WHERE email = '$testEmail'; DELETE FROM inquiries WHERE contact = '$testEmail';" 2>$null | Out-Null
    'ลบการจองและคำถามที่สร้างระหว่างทดสอบแล้ว'
}

# ---------- สรุป ----------
Write-Host ''
$results | Format-Table -Wrap -Property `
    @{ Label = 'ผล';         Expression = { $_.Result }; Width = 8 }, `
    @{ Label = 'รายการ';      Expression = { $_.Check };  Width = 44 }, `
    @{ Label = 'รายละเอียด'; Expression = { $_.Detail } }

$failed = @($results | Where-Object { $_.Result -eq 'ไม่ผ่าน' }).Count
$passed = @($results | Where-Object { $_.Result -eq 'ผ่าน' }).Count

if ($failed -eq 0) {
    Write-Host "ผ่านทั้งหมด $passed รายการ — ระบบใช้งานได้จริง`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "ผ่าน $passed · ไม่ผ่าน $failed รายการ`n" -ForegroundColor Red
    exit 1
}
