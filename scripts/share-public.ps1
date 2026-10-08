<#
.SYNOPSIS
  เปิดลิงก์สาธารณะชั่วคราวให้มือถือหรือคนนอกเครือข่ายเข้าเว็บในเครื่องนี้ได้ (Cloudflare Quick Tunnel)

.DESCRIPTION
  ใช้ตอนสาธิตหรือให้คนอื่นลองจองจากมือถือ ไม่ต้องสมัครบัญชีและไม่ต้องตั้งค่าเราเตอร์
  - ลิงก์เปลี่ยนทุกครั้งที่เปิด และใช้ได้เฉพาะตอนเครื่องนี้กับ Docker เปิดอยู่
  - ใครมีลิงก์ก็เข้าได้ รวมถึงหน้า admin.html จึงควรเปลี่ยนรหัสแอดมินเริ่มต้นก่อนส่งลิงก์ให้คนอื่น
  - สคริปต์ตั้ง APP_URL ของ API ให้เป็นลิงก์นี้ชั่วคราว ลิงก์ชำระเงินและลิงก์ในอีเมลจึงเปิดจากมือถือได้

.EXAMPLE
  .\scripts\share-public.ps1          # เปิด แล้วพิมพ์ลิงก์
  .\scripts\share-public.ps1 -Stop    # ปิด และคืนค่า APP_URL เดิม
#>
param([switch]$Stop)

Set-Location (Split-Path $PSScriptRoot -Parent)

# docker เขียนความคืบหน้าไป stderr ซึ่ง PowerShell 5.1 มองเป็น error — รันผ่าน cmd แล้วดูที่ exit code แทน
function Invoke-Docker([string]$Arguments, [switch]$IgnoreFailure) {
    $output = cmd /c "docker $Arguments 2>&1"
    if ($LASTEXITCODE -ne 0 -and -not $IgnoreFailure) {
        throw "docker $Arguments ล้มเหลว:`n$($output -join "`n")"
    }
    return $output
}

if ($Stop) {
    Invoke-Docker 'compose --profile tunnel rm --stop --force tunnel' -IgnoreFailure | Out-Null
    # สร้าง api ใหม่โดยไม่มี APP_URL ชั่วคราว จะกลับไปใช้ค่าใน .env (หรือ http://localhost:8080)
    Remove-Item Env:APP_URL -ErrorAction SilentlyContinue
    Invoke-Docker 'compose up -d api' | Out-Null
    Write-Host 'ปิดลิงก์สาธารณะแล้ว เว็บกลับมาใช้ได้เฉพาะในเครื่องที่ http://localhost:8080'
    exit 0
}

Invoke-Docker 'compose up -d' | Out-Null
# เริ่ม tunnel ใหม่ทุกครั้ง จะได้ไม่อ่านลิงก์เก่าที่ตายแล้วจาก log
Invoke-Docker 'compose --profile tunnel rm --stop --force tunnel' -IgnoreFailure | Out-Null
Invoke-Docker 'compose --profile tunnel up -d tunnel' | Out-Null

$url = $null
foreach ($attempt in 1..30) {
    Start-Sleep -Seconds 2
    $log = Invoke-Docker 'logs chokchai-tunnel' -IgnoreFailure
    $match = [regex]::Match(($log -join "`n"), 'https://[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) { $url = $match.Value; break }
}
if (-not $url) {
    Write-Host 'เปิดลิงก์สาธารณะไม่สำเร็จ ดูสาเหตุด้วย: docker logs chokchai-tunnel'
    exit 1
}

# ตัวแปรใน shell มาก่อนค่าในไฟล์ .env จึงไม่ต้องแก้ .env
$env:APP_URL = $url
Invoke-Docker 'compose up -d api' | Out-Null

Write-Host ''
Write-Host "เปิดจากมือถือได้ที่:  $url"
Write-Host "หน้าหลังบ้าน:         $url/admin.html"
Write-Host ''
Write-Host 'ลิงก์นี้ใช้ได้จนกว่าจะปิดเครื่อง หรือสั่ง  .\scripts\share-public.ps1 -Stop'
