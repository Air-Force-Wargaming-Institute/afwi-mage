Write-Host "Testing vLLM API..." -ForegroundColor Cyan

Write-Host "Sending request to http://localhost:8007/v1/completions..." -ForegroundColor Yellow

$requestBody = @{
    model = "Llama-3.2-1B-Instruct-abliterated"
    prompt = "Write a short paragraph about artificial intelligence:"
    max_tokens = 150
} | ConvertTo-Json

Write-Host "Request Body:" -ForegroundColor Gray
Write-Host $requestBody -ForegroundColor Gray
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:8007/v1/completions" `
                                -Method Post `
                                -ContentType "application/json" `
                                -Body $requestBody
    
    Write-Host "Response received!" -ForegroundColor Green
    Write-Host "`nGenerated Text:" -ForegroundColor Cyan
    Write-Host $response.choices[0].text -ForegroundColor White
    
    Write-Host "`nFull Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 4 | Write-Host
} catch {
    Write-Host "Error calling vLLM API:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body:" -ForegroundColor Red
        Write-Host $responseBody -ForegroundColor Red
    }
}

Write-Host "`nTest completed." -ForegroundColor Cyan 