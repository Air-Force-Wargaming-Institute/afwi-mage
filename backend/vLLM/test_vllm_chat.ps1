Write-Host "Testing vLLM OpenAI-compatible Chat API..." -ForegroundColor Cyan

$uri = "http://localhost:8007/v1/chat/completions"
$headers = @{
    "Content-Type" = "application/json"
}
$body = @{
    model = "/models/Llama-3.2-1B-Instruct-abliterated"
    messages = @(
        @{
            role = "system"
            content = "You are a helpful AI assistant."
        },
        @{
            role = "user"
            content = "What are three key benefits of artificial intelligence?"
        }
    )
    max_tokens = 250
    temperature = 0.7
    stream = $false
} | ConvertTo-Json -Depth 10

try {
    Write-Host "Sending request to $uri..." -ForegroundColor Yellow
    Write-Host "Request Body:" -ForegroundColor Gray
    Write-Host $body -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $body
    
    Write-Host "`nResponse received!" -ForegroundColor Green
    Write-Host "`nAssistant's Response:" -ForegroundColor Cyan
    Write-Host $response.choices[0].message.content -ForegroundColor White
    
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