$url = "https://example.com/install.ps1"
$script = Invoke-WebRequest $url
Invoke-Expression $script.Content
