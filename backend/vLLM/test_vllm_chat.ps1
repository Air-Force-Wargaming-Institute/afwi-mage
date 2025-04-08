param (
    [int]$MessageCount = 200,
    [string]$Endpoint = "http://localhost:8007/v1/chat/completions",
    [string]$Model = "/models/DeepHermes-3-Llama-3-8B-Preview",
    [int]$MaxConcurrent = 200
)

Write-Host "Testing vLLM OpenAI-compatible Chat API (Async Mode)..." -ForegroundColor Cyan

# Array of 100 different user messages for testing with diverse topics
$userMessages = @(
    # Technology & AI
    "What are three key benefits of artificial intelligence?",
    "How does machine learning differ from traditional programming?",
    "Explain the concept of neural networks in simple terms.",
    "What ethical concerns should we consider when deploying AI systems?",
    "How is natural language processing used in modern applications?",
    "What is the difference between supervised and unsupervised learning?",
    "Describe how reinforcement learning works with an example.",
    "What are the limitations of current AI technology?",
    "How might AI impact the job market in the next decade?",
    "What are some practical applications of computer vision?",
    "Explain the concept of quantum computing to a beginner.",
    "How does blockchain technology ensure security?",
    "What is edge computing and why is it important?",
    "How do recommendation systems work on streaming platforms?",
    "What are the key differences between 5G and previous cellular technologies?",
    "How are robotics being used in healthcare?",
    "What are the main challenges in cybersecurity today?",
    "How do autonomous vehicles navigate their environment?",
    "What is the Internet of Things (IoT) and its applications?",
    "How does facial recognition technology work?",

    # Science
    "Explain the theory of relativity in simple terms.",
    "How do vaccines work to protect against diseases?",
    "What is CRISPR technology and its potential applications?",
    "How do black holes form and evolve?",
    "Explain the process of photosynthesis.",
    "What is dark matter and why is it important in astrophysics?",
    "How does climate change affect biodiversity?",
    "What is the human microbiome and why is it significant?",
    "How do earthquakes occur and how are they measured?",
    "What are the major differences between RNA and DNA?",
    "Explain how nuclear fusion works.",
    "How do neurons transmit information in the brain?",
    "What is the Standard Model in particle physics?",
    "How do coral reefs form and why are they important ecosystems?",
    "What is quantum entanglement?",
    "How do antibiotics work against bacterial infections?",
    "Explain the water cycle and its importance to Earth's ecosystems.",
    "What is the theory of plate tectonics?",
    "How do MRI machines create images of the human body?",
    "What are exoplanets and how do scientists detect them?",

    # Business & Economics
    "What are the key principles of effective leadership?",
    "How does supply and demand influence market prices?",
    "What is the difference between microeconomics and macroeconomics?",
    "Explain the concept of compound interest.",
    "What are the advantages and disadvantages of different business structures?",
    "How do central banks control inflation?",
    "What is disruptive innovation with some examples?",
    "Explain the concept of opportunity cost.",
    "What are the key components of a successful business plan?",
    "How does cryptocurrency differ from traditional currency?",
    "What is the gig economy and how is it changing work?",
    "Explain the concept of comparative advantage in international trade.",
    "What are ESG investments and why are they gaining popularity?",
    "How do stock markets function?",
    "What are the major causes of economic recessions?",
    "Explain the principle of diminishing returns.",
    "What is venture capital and how does it support startups?",
    "How do companies determine optimal pricing strategies?",
    "What is the difference between monetary and fiscal policy?",
    "How do mergers and acquisitions change industry dynamics?",

    # Arts & Humanities
    "How did the Renaissance period influence modern art?",
    "What are the major themes in Shakespeare's tragedies?",
    "Explain the differences between classical and jazz music.",
    "How has filmmaking evolved over the past century?",
    "What are the key characteristics of Gothic architecture?",
    "How did Impressionism change the art world?",
    "What is magical realism in literature?",
    "How does cultural context influence artistic expression?",
    "What is the significance of mythology in ancient civilizations?",
    "How has digital technology transformed the creation of art?",
    "Explain the concept of existentialism in philosophy.",
    "What are the major differences between Eastern and Western philosophy?",
    "How did the Bauhaus movement influence modern design?",
    "What is the role of symbolism in visual arts?",
    "How has dance evolved as a form of cultural expression?",
    "What is postmodernism and its impact on contemporary art?",
    "How do different cultures approach the concept of beauty?",
    "What is the significance of oral traditions in preserving history?",
    "How has poetry evolved across different time periods?",
    "What is the relationship between art and political movements?",

    # History & Society
    "What were the main causes of World War II?",
    "How did the Industrial Revolution change society?",
    "What factors led to the fall of the Roman Empire?",
    "How has the concept of human rights evolved over time?",
    "What was the significance of the Silk Road in ancient trade?",
    "How did the Cold War shape international relations?",
    "What were the key achievements of ancient Egyptian civilization?",
    "How did colonialism impact indigenous populations?",
    "What were the major outcomes of the Civil Rights Movement?",
    "How has urbanization changed societies around the world?",
    "What were the key innovations of the Scientific Revolution?",
    "How did the printing press change the spread of knowledge?",
    "What was daily life like in medieval Europe?",
    "How have patterns of migration shaped modern societies?",
    "What were the causes and effects of the Great Depression?",
    "How did the Age of Exploration change global connections?",
    "What was the impact of the Agricultural Revolution on human societies?",
    "How has the role of women changed throughout history?",
    "What were the main philosophical ideas behind the Enlightenment?",
    "How did ancient Mesopotamian civilization contribute to human progress?",

    # Psychology & Health
    "What are the main theories of personality development?",
    "How does chronic stress affect physical health?",
    "What is cognitive behavioral therapy and how does it work?",
    "Explain the different stages of sleep and their functions.",
    "How do vaccines create herd immunity?",
    "What is the relationship between diet and mental health?",
    "How does the placebo effect work?",
    "What are the psychological effects of social media use?",
    "How do habits form and what are effective strategies to change them?",
    "What is mindfulness meditation and its benefits?",
    "How does memory work and why do we forget things?",
    "What are the different types of cognitive biases?",
    "How does exercise impact brain function?",
    "What is the gut-brain connection?",
    "How do different parenting styles affect child development?",
    "What are the psychological factors behind decision-making?",
    "How does aging affect cognitive abilities?",
    "What is emotional intelligence and why is it important?",
    "How do cultural differences influence perception?",
    "What are effective strategies for managing anxiety?"
)

$headers = @{
    "Content-Type" = "application/json"
}

# Validate input
if ($MessageCount -lt 1) {
    $MessageCount = 1
    Write-Host "Message count must be at least 1. Using default: 1" -ForegroundColor Yellow
}

# Import ThreadJob module if needed
if (!(Get-Module -Name ThreadJob -ListAvailable)) {
    Write-Host "Installing ThreadJob module..." -ForegroundColor Yellow
    Install-Module -Name ThreadJob -Force -Scope CurrentUser
}
Import-Module ThreadJob

Write-Host "Will send $MessageCount messages to the vLLM API" -ForegroundColor Cyan
Write-Host "Using endpoint: $Endpoint" -ForegroundColor Cyan
Write-Host "Using model: $Model" -ForegroundColor Cyan
Write-Host "Maximum concurrent requests: $MaxConcurrent" -ForegroundColor Cyan

# Storage for responses
$allResponses = @()

# Start timer
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

# Create ScriptBlock for the job
$jobScriptBlock = {
    param($messageNumber, $message, $endpoint, $model)
    
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $body = @{
        model = $model
        messages = @(
            @{
                role = "system"
                content = "You are a helpful AI assistant."
            },
            @{
                role = "user"
                content = $message
            }
        )
        max_tokens = 250
        temperature = 0.7
        stream = $false
    } | ConvertTo-Json -Depth 10

    try {
        $requestStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Body $body
        $requestStopwatch.Stop()
        
        return @{
            Success = $true
            MessageNumber = $messageNumber
            Query = $message
            Response = $response.choices[0].message.content
            ElapsedMs = $requestStopwatch.ElapsedMilliseconds
            FullResponse = $response
        }
    }
    catch {
        return @{
            Success = $false
            MessageNumber = $messageNumber
            Query = $message
            ErrorMessage = $_.Exception.Message
            ResponseBody = if ($_.Exception.Response) {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $reader.BaseStream.Position = 0
                $reader.DiscardBufferedData()
                $reader.ReadToEnd()
            } else { "No response body" }
        }
    }
}

# Launch jobs in batches to manage concurrency
$jobs = @()
for ($i = 0; $i -lt $MessageCount; $i++) {
    $messageIndex = $i % 100
    $currentMessage = $userMessages[$messageIndex]
    $messageNum = $i+1
    $previewLength = [Math]::Min(40, $currentMessage.Length)
    $preview = $currentMessage.Substring(0, $previewLength)
    
    Write-Host "Queuing message $messageNum of $MessageCount`: '$preview...'" -ForegroundColor Yellow
    
    $jobs += Start-ThreadJob -ScriptBlock $jobScriptBlock -ArgumentList ($i+1), $currentMessage, $Endpoint, $Model -ThrottleLimit $MaxConcurrent
}

Write-Host "`nAll $MessageCount requests have been queued. Waiting for responses..." -ForegroundColor Cyan

# Wait for all jobs to complete
$completedJobs = 0
while ($completedJobs -lt $jobs.Count) {
    $newlyCompleted = $jobs | Where-Object { $_.State -eq "Completed" -and $_.HasMoreData }
    
    foreach ($job in $newlyCompleted) {
        $result = Receive-Job -Job $job
        
        if ($result.Success) {
            Write-Host "Request $($result.MessageNumber) completed in $($result.ElapsedMs)ms" -ForegroundColor Green
            
            # Store response with metadata
            $responseObject = [PSCustomObject]@{
                MessageNumber = $result.MessageNumber
                Query = $result.Query
                Response = $result.Response
                ElapsedMs = $result.ElapsedMs
                FullResponse = $result.FullResponse
            }
            $allResponses += $responseObject
            
            # Brief output for monitoring progress
            $previewLength = [Math]::Min(60, $result.Response.Length)
            $preview = $result.Response.Substring(0, $previewLength)
            Write-Host "Response preview: $preview..." -ForegroundColor White
        }
        else {
            Write-Host "Error in request $($result.MessageNumber): $($result.ErrorMessage)" -ForegroundColor Red
            
            # Add error to responses
            $responseObject = [PSCustomObject]@{
                MessageNumber = $result.MessageNumber
                Query = $result.Query
                Response = "ERROR: $($result.ErrorMessage)"
                ElapsedMs = 0
                FullResponse = $null
            }
            $allResponses += $responseObject
        }
        
        # Mark job as processed
        $job.StopJob()
        $completedJobs++
    }
    
    # Small pause to prevent CPU thrashing
    Start-Sleep -Milliseconds 100
}

# Clean up jobs
$jobs | Remove-Job -Force

# Stop timer
$stopwatch.Stop()
$totalTime = $stopwatch.ElapsedMilliseconds

# Sort responses by message number
$allResponses = $allResponses | Sort-Object -Property MessageNumber

# Display detailed results
Write-Host "`n=== DETAILED RESULTS ===" -ForegroundColor Cyan
foreach ($result in $allResponses) {
    Write-Host "`n--- MESSAGE $($result.MessageNumber) ---" -ForegroundColor Yellow
    Write-Host "Query: $($result.Query)" -ForegroundColor Gray
    Write-Host "Response time: $($result.ElapsedMs)ms" -ForegroundColor Gray
    Write-Host "Response:" -ForegroundColor White
    Write-Host $result.Response -ForegroundColor White
}

# Performance summary
$successfulResponses = $allResponses | Where-Object { $_.ElapsedMs -gt 0 }
$avgResponseTime = if ($successfulResponses.Count -gt 0) {
    $successfulResponses | Measure-Object -Property ElapsedMs -Average | Select-Object -ExpandProperty Average
} else { 0 }

Write-Host "`n=== PERFORMANCE SUMMARY ===" -ForegroundColor Green
Write-Host "Total time: $($totalTime / 1000) seconds ($totalTime ms)" -ForegroundColor Green
Write-Host "Messages sent: $MessageCount" -ForegroundColor Green
Write-Host "Successful responses: $($successfulResponses.Count)" -ForegroundColor Green
Write-Host "Average response time: $avgResponseTime ms" -ForegroundColor Green
Write-Host "Throughput: $([math]::Round($MessageCount / ($totalTime / 1000), 2)) requests/second" -ForegroundColor Green
Write-Host "Test completed." -ForegroundColor Cyan