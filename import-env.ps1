$envFile = ".env"

Get-Content $envFile | ForEach-Object {
    # Пропустити пусті рядки або коментарі
    if ($_ -match "^\s*([^#][A-Za-z0-9_]+)=(.*)$") {
        $name = $matches[1]
        $value = $matches[2]

        Write-Host "Uploading $name ..."
        
        # Передаємо значення у stdin для vercel env add
        $value | vercel env add $name production
    }
}
