resource "aws_ecr_repository" "api_repo" {
  name = "mcp-agent-api"

  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project     = "mcp-agent-dashboard"
    Environment = var.environment
  }
}

resource "aws_ecr_lifecycle_policy" "api_repo_policy" {
  repository = aws_ecr_repository.api_repo.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        action = {
          type = "expire"
        }
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
      }
    ]
  })
}
