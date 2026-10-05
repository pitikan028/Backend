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
    [string]$AdminPassword = 'Admin@1234',
    [string]$MailpitUrl = 'http://localhost:8025'
)

$ErrorActionPreference = 'Stop'
$api = "$BaseUrl/api"
$results = @()
$testEmail = "smoke.test@example.com"
$memberEmail = "smoke.member@example.com"

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
Test-Step 'Container ทำงานครบ 4 ตัว' {
    $up = docker compose -f "$PSScriptRoot\..\docker-compose.yml" ps --format '{{.Name}} {{.Status}}' 2>$null
    $count = ($up | Where-Object { $_ -match 'Up' } | Measure-Object).Count
    if ($count -lt 4) { throw "ทำงานอยู่ $count ตัว (ต้องเป็น 4)" }
    "web, api, postgres, mailpit ทำงานอยู่"
}

# ---------- 2. หน้าเว็บ ----------
$pages = @('/', '/activities.html', '/activity.html', '/register.html', '/login.html',
           '/account.html', '/booking.html', '/payment.html', '/admin.html', '/css/app.css')
foreach ($page in $pages) {
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

# ---------- 8. ค้นหากิจกรรม / ค่าตั้งระบบ ----------
Test-Step 'ค้นหาและกรองกิจกรรม' {
    $found = (Invoke-RestMethod "$api/activities?q=bathing").data
    if ($found.Count -ne 1) { throw "ค้น bathing ได้ $($found.Count) รายการ ควรเป็น 1" }
    $adventure = Invoke-RestMethod "$api/activities?category=adventure&sort=price_desc"
    "ค้น 'bathing' พบ 1 · หมวด adventure พบ $($adventure.data.Count) · หมวดทั้งหมด: $($adventure.meta.categories -join ', ')"
}

$settings = $null
Test-Step 'ค่าตั้งระบบสาธารณะ' {
    $script:settings = (Invoke-RestMethod "$api/settings").data
    if ($settings.PSObject.Properties.Name -contains 'admin_notify_email') { throw 'ค่าหลังบ้านรั่วออกมาใน API สาธารณะ' }
    "เวลาทำการ: $($settings.opening_hours) · ชำระเงิน: $($settings.payment_provider)"
}

# ---------- 9. สมาชิก ----------
docker exec chokchai-postgres psql -U chokchai -d chokchai -q -c "DELETE FROM bookings WHERE email = '$memberEmail'; DELETE FROM users WHERE email = '$memberEmail';" 2>$null | Out-Null

$member = $null
Test-Step 'สมัครสมาชิก' {
    $body = @{ email = $memberEmail; password = 'Smoke1234'; first_name = 'สมาชิก'; last_name = 'ทดสอบ'; phone = '081-222-2222' } | ConvertTo-Json
    $r = (Invoke-RestMethod "$api/account/register" -Method Post -Body $body -ContentType 'application/json; charset=utf-8').data
    $script:member = @{ Authorization = "Bearer $($r.token)" }
    "สมัครเป็น $($r.user.email)"
}

Test-Step 'สมัครซ้ำด้วยอีเมลเดิมต้องไม่ได้' {
    $body = @{ email = $memberEmail; password = 'Smoke1234'; first_name = 'a'; last_name = 'b' } | ConvertTo-Json
    Assert-Rejected -Url "$api/account/register" -Method 'POST' -Body $body -Expected 409
}

Test-Step 'รหัสผ่านผิดต้องเข้าสู่ระบบไม่ได้' {
    $body = @{ email = $memberEmail; password = 'wrong-password1' } | ConvertTo-Json
    Assert-Rejected -Url "$api/account/login" -Method 'POST' -Body $body -Expected 401
}

Test-Step 'token ของลูกค้าต้องเข้าหลังบ้านไม่ได้' {
    Assert-Rejected -Url "$api/admin/stats" -Headers $member -Expected 403
}

$memberBooking = $null
Test-Step 'จองแบบสมาชิก แล้วอยู่ในประวัติการจอง' {
    $body = @{
        activity_slug = 'ziplining'; booking_date = $date
        adults = 1; children = 0; infants = 0
        first_name = 'สมาชิก'; last_name = 'ทดสอบ'
        phone = '081-222-2222'; email = $memberEmail
        accept_terms = $true
    } | ConvertTo-Json
    $script:memberBooking = (Invoke-RestMethod "$api/bookings" -Method Post -Headers $member -Body $body -ContentType 'application/json; charset=utf-8').data
    $history = (Invoke-RestMethod "$api/account/bookings" -Headers $member).data
    if ($history[0].booking_ref -ne $memberBooking.booking_ref) { throw 'ไม่พบการจองในประวัติของบัญชี' }
    "รหัส $($memberBooking.booking_ref) · ยกเลิกเองได้: $($history[0].cancellation.can_cancel)"
}

# ---------- 10. ชำระเงิน ----------
Test-Step 'ชำระเงินออนไลน์ แล้วการจองถูกยืนยันอัตโนมัติ' {
    if ($settings.payment_provider -ne 'mock') { return "provider = $($settings.payment_provider) — ข้ามการชำระจำลอง" }
    $checkout = (Invoke-RestMethod "$api/account/bookings/$($memberBooking.booking_ref)/pay" -Method Post -Headers $member).data
    $token = ([regex]'token=([a-f0-9]+)').Match($checkout.checkout_url).Groups[1].Value
    $body = @{ ref = $memberBooking.booking_ref; token = $token } | ConvertTo-Json
    $paid = (Invoke-RestMethod "$api/payments/mock/confirm" -Method Post -Body $body -ContentType 'application/json').data
    if ($paid.payment_status -ne 'paid' -or $paid.status -ne 'confirmed') { throw "ได้ $($paid.status)/$($paid.payment_status)" }
    "$($paid.booking_ref) → $($paid.status) / $($paid.payment_status)"
}

Test-Step 'ลิงก์ชำระเงินปลอมต้องใช้ไม่ได้' {
    Assert-Rejected -Url "$api/payments/status?ref=$($memberBooking.booking_ref)&token=0000000000000000000000000000000000000000" -Expected 403
}

# ---------- 11. ยกเลิกการจอง ----------
Test-Step 'ลูกค้ายกเลิกการจองเอง' {
    $c = (Invoke-RestMethod "$api/account/bookings/$($memberBooking.booking_ref)/cancel" -Method Post -Headers $member `
          -Body (@{ reason = 'smoke-test' } | ConvertTo-Json) -ContentType 'application/json; charset=utf-8').data
    if ($c.status -ne 'cancelled') { throw "สถานะ = $($c.status)" }
    "$($c.booking_ref) → $($c.status)"
}

Test-Step 'ยกเลิกซ้ำต้องถูกปฏิเสธ' {
    Assert-Rejected -Url "$api/account/bookings/$($memberBooking.booking_ref)/cancel" -Method 'POST' -Headers $member -Body '{}' -Expected 409
}

# ---------- 12. อีเมลแจ้งเตือน ----------
Test-Step 'การแจ้งเตือนในบัญชีของลูกค้า' {
    $n = Invoke-RestMethod "$api/account/notifications" -Headers $member
    $types = $n.data.type -join ', '
    foreach ($need in @('welcome', 'booking_created', 'booking_cancelled')) {
        if ($n.data.type -notcontains $need) { throw "ไม่มีการแจ้งเตือนประเภท $need (มี: $types)" }
    }
    "$($n.data.Count) รายการ: $types"
}

Test-Step 'อีเมลถูกส่งถึง Mailpit' {
    Start-Sleep -Seconds 2
    try { $mail = Invoke-RestMethod "$MailpitUrl/api/v1/search?query=to:$memberEmail" -TimeoutSec 10 }
    catch { return 'เปิด Mailpit ไม่ได้ (ถ้าตั้ง SMTP จริงไว้ ข้ามข้อนี้ได้)' }
    if ($mail.messages_count -lt 3) { throw "พบ $($mail.messages_count) ฉบับ ควรมีอย่างน้อย 3" }
    "$($mail.messages_count) ฉบับ — เปิดดูได้ที่ $MailpitUrl"
}

# ---------- 13. หลังบ้านส่วนที่เพิ่มใหม่ ----------
Test-Step 'รายงานยอดจอง' {
    $r = (Invoke-RestMethod "$api/admin/reports" -Headers $headers).data
    "$($r.from) ถึง $($r.to): จอง $($r.totals.bookings) · ยกเลิก $($r.totals.cancelled) · รายได้ $($r.totals.revenue) บาท"
}

Test-Step 'รายชื่อลูกค้าและทีมงาน' {
    $u = Invoke-RestMethod "$api/admin/users?q=$memberEmail" -Headers $headers
    if ($u.data.Count -ne 1) { throw "ค้นลูกค้าได้ $($u.data.Count) รายการ ควรเป็น 1" }
    $staff = (Invoke-RestMethod "$api/admin/staff" -Headers $headers).data
    "ลูกค้า: $($u.data[0].email) (จอง $($u.data[0].booking_count) ครั้ง) · ทีมงาน $($staff.Count) บัญชี"
}

Test-Step 'ค่าตั้งระบบ (อ่านและบันทึก)' {
    $s = (Invoke-RestMethod "$api/admin/settings" -Headers $headers).data
    $saved = (Invoke-RestMethod "$api/admin/settings" -Method Put -Headers $headers `
              -Body (@{ cancel_free_hours = $s.cancel_free_hours } | ConvertTo-Json) -ContentType 'application/json').data
    "ยกเลิกฟรีก่อน $($saved.cancel_free_hours) ชม. · จองล่วงหน้า $($saved.booking_min_lead_days) วัน · สูงสุด $($saved.booking_max_guests) คน"
}

# ---------- ล้างข้อมูลทดสอบ ----------
Test-Step 'ล้างข้อมูลทดสอบ' {
    docker exec chokchai-postgres psql -U chokchai -d chokchai -q -c `
        "DELETE FROM bookings WHERE email IN ('$testEmail', '$memberEmail'); DELETE FROM inquiries WHERE contact = '$testEmail'; DELETE FROM users WHERE email = '$memberEmail'; DELETE FROM notifications WHERE recipient IN ('$testEmail', '$memberEmail');" 2>$null | Out-Null
    'ลบการจอง บัญชี คำถาม และการแจ้งเตือนที่สร้างระหว่างทดสอบแล้ว'
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
