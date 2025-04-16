Write-Host "Testing vLLM OpenAI-compatible API..." -ForegroundColor Cyan

$uri = "http://localhost:8007/v1/completions"
$headers = @{
    "Content-Type" = "application/json"
}
$body = @{
    model = "/models/DeepSeek-R1-Distill-Qwen-7B-abliterated-v2"
    prompt = "Write a long story about artificial intelligence:"
    max_tokens = 150
    temperature = 0.7
    top_p = 0.95
    stream = $false
} | ConvertTo-Json

try {
    Write-Host "Sending request to $uri..." -ForegroundColor Yellow
    Write-Host "Request Body:" -ForegroundColor Gray
    Write-Host $body -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
    
    Write-Host "`nResponse received!" -ForegroundColor Green
    Write-Host "`nGenerated Text:" -ForegroundColor Cyan
    Write-Host $response.choices[0].text -ForegroundColor White
    
    Write-Host "`nFull Response Details:" -ForegroundColor Yellow
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