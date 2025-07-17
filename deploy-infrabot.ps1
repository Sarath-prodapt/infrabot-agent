# Basic InfraBot deployment script with improved error handling
param(
    [string]$ResourceGroup = "IT-Support-Infra-Bot-POC",
    [string]$Location = "eastus",
    [string]$EnvironmentName = "infrabot-env",
    [string]$AcrName = "itrepo",
    [switch]$UseExistingResourceGroup,
    [switch]$UseExistingEnvironment,
    [switch]$SkipImageChecks
)

# Azure OpenAI configuration
$AzureOpenAiEndpoint = "https://prodapt-it-open-ai-services.openai.azure.com/"
$AzureOpenAiApiKey = "3BZzAugWites0ZXSThCXarjTEbnx0wnuTS2IwbudDhRz9Ic8INy3JQQJ99BFACYeBjFXJ3w3AAABACOGnOKK"
$AzureOpenAiDeployment = "o3-mini"
$AzureOpenAiApiVersion = "2024-12-01-preview"
$AzureOpenAiEmbeddingDeployment = "text-embedding-3-large"

Write-Host "Deploying InfraBot to Azure Container Apps..." -ForegroundColor Green

# Check Azure login status
try {
    $loginStatus = az account show --query "name" -o tsv
    if (-not $loginStatus) { throw "Not logged in" }
    Write-Host "Logged in as: $loginStatus" -ForegroundColor Green
} 
catch {
    Write-Host "You are not logged into Azure. Please login using 'az login' first." -ForegroundColor Red
    exit 1
}

# Check permissions by testing a read operation
try {
    Write-Host "Checking Azure permissions..." -ForegroundColor Yellow
    $subscriptionId = az account show --query "id" -o tsv
    Write-Host "Using subscription: $subscriptionId" -ForegroundColor Green
}
catch {
    Write-Host "You may not have sufficient permissions on this subscription." -ForegroundColor Red
    exit 1
}

# Create resource group if it doesn't exist
if (-not $UseExistingResourceGroup) {
    Write-Host "Creating resource group..." -ForegroundColor Yellow
    try {
        $rgExists = az group exists --name $ResourceGroup
        if ($rgExists -ne "true") {
            az group create --name $ResourceGroup --location $Location
            Write-Host "Resource group '$ResourceGroup' created." -ForegroundColor Green
        } else {
            Write-Host "Resource group '$ResourceGroup' already exists." -ForegroundColor Green
            $UseExistingResourceGroup = $true
        }
    }
    catch {
        Write-Host "Error creating resource group: $_" -ForegroundColor Red
        Write-Host "Try using an existing resource group with -UseExistingResourceGroup" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Using existing resource group: $ResourceGroup" -ForegroundColor Green
}

# Create Container Apps environment if it doesn't exist
if (-not $UseExistingEnvironment) {
    Write-Host "Creating Container Apps environment..." -ForegroundColor Yellow
    try {
        # Check if environment exists first
        $envExists = $false
        $envCheck = az containerapp env list --resource-group $ResourceGroup --query "[?name=='$EnvironmentName'].name" -o tsv
        if ($envCheck -eq $EnvironmentName) {
            $envExists = $true
            Write-Host "Container Apps environment '$EnvironmentName' already exists." -ForegroundColor Green
        }
        
        if (-not $envExists) {
            # Create with infrastructure mode to avoid Log Analytics dependency
            az containerapp env create --name $EnvironmentName --resource-group $ResourceGroup --location $Location --infrastructure-resource-group "rg-$EnvironmentName-infra"
            Write-Host "Container Apps environment created." -ForegroundColor Green
            Start-Sleep -Seconds 30  # Give more time for environment to provision
        }
    }
    catch {
        Write-Host "Error creating Container Apps environment: $_" -ForegroundColor Red
        Write-Host "Try using an existing environment with -UseExistingEnvironment" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "Using existing Container Apps environment: $EnvironmentName" -ForegroundColor Green
}

# Verify environment exists before proceeding
try {
    $envCheck = az containerapp env show --name $EnvironmentName --resource-group $ResourceGroup --query "name" -o tsv
    if (-not $envCheck) {
        throw "Container Apps environment not found"
    }
    Write-Host "Verified Container Apps environment exists." -ForegroundColor Green
}
catch {
    Write-Host "Container Apps environment '$EnvironmentName' not found or not accessible." -ForegroundColor Red
    Write-Host "Please create it manually in the Azure portal and try again." -ForegroundColor Yellow
    exit 1
}

# Create storage account for persistent volumes
Write-Host "Creating storage account for persistent volumes..." -ForegroundColor Yellow
$StorageAccountName = "infrabot$((Get-Random).ToString().Substring(0,6))"
try {
    # Check if we need a storage account
    $storageExists = az storage account list --resource-group $ResourceGroup --query "[?starts_with(name, 'infrabot')].name" -o tsv
    if (-not $storageExists) {
        az storage account create --name $StorageAccountName --resource-group $ResourceGroup --location $Location --sku Standard_LRS --kind StorageV2
        Write-Host "Storage account '$StorageAccountName' created." -ForegroundColor Green
    } else {
        $StorageAccountName = $storageExists
        Write-Host "Using existing storage account: $StorageAccountName" -ForegroundColor Green
    }
    
    # Get storage account key
    $StorageKey = az storage account keys list --account-name $StorageAccountName --resource-group $ResourceGroup --query "[0].value" -o tsv
    
    # Create file shares for persistent storage
    Write-Host "Creating file shares..." -ForegroundColor Yellow
    az storage share create --name etcd-data --account-name $StorageAccountName --account-key $StorageKey --quota 10
    az storage share create --name minio-data --account-name $StorageAccountName --account-key $StorageKey --quota 50
    az storage share create --name milvus-data --account-name $StorageAccountName --account-key $StorageKey --quota 100
    
    Write-Host "File shares created successfully." -ForegroundColor Green

    # Define storage mounts in the environment
    Write-Host "Defining storage mounts in the environment..." -ForegroundColor Yellow
    az containerapp env storage set --name $EnvironmentName --resource-group $ResourceGroup --storage-name etcd-storage --azure-file-account-name $StorageAccountName --azure-file-account-key $StorageKey --azure-file-share-name etcd-data --access-mode ReadWrite
    az containerapp env storage set --name $EnvironmentName --resource-group $ResourceGroup --storage-name minio-storage --azure-file-account-name $StorageAccountName --azure-file-account-key $StorageKey --azure-file-share-name minio-data --access-mode ReadWrite
    az containerapp env storage set --name $EnvironmentName --resource-group $ResourceGroup --storage-name milvus-storage --azure-file-account-name $StorageAccountName --azure-file-account-key $StorageKey --azure-file-share-name milvus-data --access-mode ReadWrite
}
catch {
    Write-Host "Error creating storage resources: $_" -ForegroundColor Red
    Write-Host "Continuing with temporary storage..." -ForegroundColor Yellow
    $StorageAccountName = $null
}

# Deploy Milvus if it doesn't exist
try {
    $milvusExists = az containerapp list --resource-group $ResourceGroup --query "[?name=='milvus-service'].name" -o tsv
    if ($milvusExists -ne "milvus-service") {
        Write-Host "Deploying Milvus vector database components..." -ForegroundColor Yellow
        
        # Deploy etcd first with persistent volume
        Write-Host "Deploying etcd..." -ForegroundColor Yellow
        if ($StorageAccountName) {
            # With persistent storage
            az containerapp create --name milvus-etcd --resource-group $ResourceGroup --environment $EnvironmentName --image quay.io/coreos/etcd:v3.5.5 --target-port 2379 --ingress internal --cpu 0.5 --memory 1Gi --min-replicas 1 --max-replicas 1 --env-vars "ETCD_AUTO_COMPACTION_MODE=revision" "ETCD_AUTO_COMPACTION_RETENTION=1000" "ETCD_QUOTA_BACKEND_BYTES=4294967296" "ETCD_SNAPSHOT_COUNT=50000" "ETCD_LISTEN_CLIENT_URLS=http://0.0.0.0:2379" "ETCD_ADVERTISE_CLIENT_URLS=http://milvus-etcd:2379" --command "etcd" --args "--data-dir=/etcd-data --listen-client-urls=http://0.0.0.0:2379 --advertise-client-urls=http://milvus-etcd:2379" --mount "etcd-storage:/etcd-data"
        } else {
            # With temporary storage
            az containerapp create --name milvus-etcd --resource-group $ResourceGroup --environment $EnvironmentName --image quay.io/coreos/etcd:v3.5.5 --target-port 2379 --ingress internal --cpu 0.5 --memory 1Gi --min-replicas 1 --max-replicas 1 --env-vars "ETCD_AUTO_COMPACTION_MODE=revision" "ETCD_AUTO_COMPACTION_RETENTION=1000" "ETCD_QUOTA_BACKEND_BYTES=4294967296" "ETCD_SNAPSHOT_COUNT=50000" "ETCD_LISTEN_CLIENT_URLS=http://0.0.0.0:2379" "ETCD_ADVERTISE_CLIENT_URLS=http://milvus-etcd:2379" --command "etcd" --args "--data-dir=/etcd-data --listen-client-urls=http://0.0.0.0:2379 --advertise-client-urls=http://milvus-etcd:2379" --ephemeral-storage 4Gi
        }
        
        Write-Host "Waiting for etcd to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 45
        
        # Deploy minio with persistent volume
        Write-Host "Deploying minio..." -ForegroundColor Yellow
        if ($StorageAccountName) {
            # With persistent storage
            az containerapp create --name milvus-minio --resource-group $ResourceGroup --environment $EnvironmentName --image minio/minio:RELEASE.2023-03-20T20-16-18Z --target-port 9000 --ingress internal --cpu 0.5 --memory 1Gi --min-replicas 1 --max-replicas 1 --env-vars "MINIO_ROOT_USER=minioadmin" "MINIO_ROOT_PASSWORD=minioadmin" --command "minio" --args "server /minio-data --console-address :9001" --mount "minio-storage:/minio-data"
        } else {
            # With temporary storage
            az containerapp create --name milvus-minio --resource-group $ResourceGroup --environment $EnvironmentName --image minio/minio:RELEASE.2023-03-20T20-16-18Z --target-port 9000 --ingress internal --cpu 0.5 --memory 1Gi --min-replicas 1 --max-replicas 1 --env-vars "MINIO_ROOT_USER=minioadmin" "MINIO_ROOT_PASSWORD=minioadmin" --command "minio" --args "server /minio-data --console-address :9001" --ephemeral-storage 4Gi
        }
        
        Write-Host "Waiting for minio to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 45
        
        # Deploy milvus standalone with proper etcd and minio connections and persistent volume
        Write-Host "Deploying milvus standalone..." -ForegroundColor Yellow
        if ($StorageAccountName) {
            # With persistent storage
            az containerapp create --name milvus-service --resource-group $ResourceGroup --environment $EnvironmentName --image milvusdb/milvus:v2.3.5 --target-port 19530 --ingress internal --cpu 1.0 --memory 2Gi --min-replicas 1 --max-replicas 1 --env-vars "ETCD_ENDPOINTS=milvus-etcd:2379" "MINIO_ADDRESS=milvus-minio:9000" "MINIO_ACCESS_KEY_ID=minioadmin" "MINIO_SECRET_ACCESS_KEY=minioadmin" "MINIO_USE_SSL=false" --command "milvus" --args "run standalone" --mount "milvus-storage:/var/lib/milvus"
        } else {
            # With temporary storage
            az containerapp create --name milvus-service --resource-group $ResourceGroup --environment $EnvironmentName --image milvusdb/milvus:v2.3.5 --target-port 19530 --ingress internal --cpu 1.0 --memory 2Gi --min-replicas 1 --max-replicas 1 --env-vars "ETCD_ENDPOINTS=milvus-etcd:2379" "MINIO_ADDRESS=milvus-minio:9000" "MINIO_ACCESS_KEY_ID=minioadmin" "MINIO_SECRET_ACCESS_KEY=minioadmin" "MINIO_USE_SSL=false" --command "milvus" --args "run standalone" --ephemeral-storage 4Gi
        }
        
        Write-Host "Milvus components deployed. Waiting for them to be ready..." -ForegroundColor Green
        Start-Sleep -Seconds 120
        
        # Verify Milvus is responding (add health check like in comprehensive script)
        Write-Host "Verifying Milvus service health..." -ForegroundColor Yellow
        $milvusHealthy = $false
        $maxAttempts = 30
        $attempt = 0

        while (-not $milvusHealthy -and $attempt -lt $maxAttempts) {
            $attempt++
            Write-Host "   Checking Milvus health (attempt $attempt/$maxAttempts)..." -ForegroundColor Gray
            
            try {
                $milvusStatus = az containerapp show --name milvus-service --resource-group $ResourceGroup --query "properties.runningStatus" -o tsv
                if ($milvusStatus -eq "Running") {
                    $milvusHealthy = $true
                    Write-Host "   Milvus is running!" -ForegroundColor Green
                } else {
                    Write-Host "   Milvus status: $milvusStatus" -ForegroundColor Yellow
                    Start-Sleep -Seconds 10
                }
            } catch {
                Write-Host "   Error checking Milvus status" -ForegroundColor Red
                Start-Sleep -Seconds 10
            }
        }

        if (-not $milvusHealthy) {
            Write-Host "Milvus failed to start properly. Check logs with: az containerapp logs show --name milvus-service --resource-group $ResourceGroup" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "Milvus service already exists." -ForegroundColor Green
    }
}
catch {
    Write-Host "Error deploying Milvus: $_" -ForegroundColor Red
    exit 1
}

# Fetch ACR credentials for image pull
Write-Host "Fetching ACR credentials..." -ForegroundColor Yellow
$AcrUsername = $AcrName
$AcrPassword = az acr credential show --name $AcrName --query "passwords[0].value" -o tsv
if (-not $AcrPassword) {
    Write-Host "Error: Failed to get ACR credentials for '$AcrName'. Check ACR name and permissions." -ForegroundColor Red
    exit 1
}
Write-Host "Successfully fetched ACR credentials." -ForegroundColor Green

# Check if backend service exists
$backendExists = az containerapp list --resource-group $ResourceGroup --query "[?name=='backend-service'].name" -o tsv
if ($backendExists -ne "backend-service") {
    # Deploy Backend Service
    Write-Host "Deploying backend service..." -ForegroundColor Yellow
    try {
        # Enhanced backend environment variables to match comprehensive script
        az containerapp create --name backend-service --resource-group $ResourceGroup --environment $EnvironmentName --image "$AcrName.azurecr.io/infrabot-backend:latest" --target-port 8000 --ingress external --cpu 0.5 --memory 1Gi --min-replicas 1 --max-replicas 3 --registry-server "$AcrName.azurecr.io" --registry-username $AcrUsername --registry-password $AcrPassword --env-vars "ENVIRONMENT=azure" "MILVUS_HOST=milvus-service" "MILVUS_PORT=19530" "BACKEND_URL=http://backend-service:8000" "LOG_LEVEL=INFO" "MILVUS_COLLECTION_NAME=infrabot_knowledgebase" "AZURE_OPENAI_ENDPOINT=$AzureOpenAiEndpoint" "AZURE_OPENAI_DEPLOYMENT=$AzureOpenAiDeployment" "AZURE_OPENAI_API_VERSION=$AzureOpenAiApiVersion" "AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=$AzureOpenAiEmbeddingDeployment" "AZURE_OPENAI_EMBEDDING_MODEL_NAME=text-embedding-3-large" "OPENAI_MODEL_NAME=o3-mini" "DEBUG=False" "PYTHONUNBUFFERED=1" "MILVUS_URI=http://milvus-service:19530" "MILVUS_TIMEOUT=60" "MILVUS_RETRY_ATTEMPTS=60" --secrets "azure-openai-api-key=$AzureOpenAiApiKey" "openai-api-key=$AzureOpenAiApiKey"
        Write-Host "Backend service deployed. Waiting for it to be ready..." -ForegroundColor Green
        Start-Sleep -Seconds 30
    }
    catch {
        Write-Host "Error deploying backend service: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "Backend service already exists." -ForegroundColor Green
}

# Get backend URL for frontend
$BackendFqdn = az containerapp show --name backend-service --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
Write-Host "Backend URL: https://$BackendFqdn" -ForegroundColor Green

# Check if frontend service exists
$frontendExists = az containerapp list --resource-group $ResourceGroup --query "[?name=='frontend-service'].name" -o tsv
if ($frontendExists -ne "frontend-service") {
    # Deploy Frontend Service
    Write-Host "Deploying frontend service..." -ForegroundColor Yellow
    try {
        az containerapp create --name frontend-service --resource-group $ResourceGroup --environment $EnvironmentName --image "$AcrName.azurecr.io/infrabot-frontend:latest" --target-port 3000 --ingress external --cpu 0.25 --memory 0.5Gi --min-replicas 1 --max-replicas 2 --registry-server "$AcrName.azurecr.io" --registry-username $AcrUsername --registry-password $AcrPassword --env-vars "NODE_ENV=production" "NEXT_TELEMETRY_DISABLED=1" "NEXT_PUBLIC_API_URL=https://$BackendFqdn" "NEXT_PUBLIC_BACKEND_URL=https://$BackendFqdn" "BACKEND_URL=https://$BackendFqdn" "API_URL=https://$BackendFqdn" "HOSTNAME=0.0.0.0" "PORT=3000"
        Write-Host "Frontend service deployed. Waiting for it to be ready..." -ForegroundColor Green
        Start-Sleep -Seconds 30
    }
    catch {
        Write-Host "Error deploying frontend service: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "Frontend service already exists." -ForegroundColor Green
}

# Get frontend URL
$FrontendFqdn = az containerapp show --name frontend-service --resource-group $ResourceGroup --query "properties.configuration.ingress.fqdn" -o tsv
Write-Host "Frontend URL: https://$FrontendFqdn" -ForegroundColor Green

# Update backend CORS
Write-Host "Updating backend CORS configuration..." -ForegroundColor Yellow
try {
    az containerapp update --name backend-service --resource-group $ResourceGroup --set-env-vars "CORS_ORIGINS=https://$FrontendFqdn,https://$BackendFqdn" "FRONTEND_URL=https://$FrontendFqdn" "ALLOWED_HOSTS=$BackendFqdn,$FrontendFqdn,localhost"
    Write-Host "Backend CORS configuration updated." -ForegroundColor Green
}
catch {
    Write-Host "Warning: Could not update backend CORS settings. You may need to do this manually." -ForegroundColor Yellow
}

# Display results
Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: https://$FrontendFqdn" -ForegroundColor White
Write-Host "   Backend: https://$BackendFqdn" -ForegroundColor White
Write-Host ""
Write-Host "Test the deployment:" -ForegroundColor Cyan
Write-Host "   Frontend Health: https://$FrontendFqdn/api/health" -ForegroundColor White
Write-Host "   Backend Health: https://$BackendFqdn/health" -ForegroundColor White
Write-Host "   Application: https://$FrontendFqdn" -ForegroundColor White
