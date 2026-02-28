resource "aws_s3_bucket" "model_artifacts" {
  bucket = "mcp-agent-model-artifacts-${data.aws_caller_identity.current.account_id}"

  tags = {
    Project     = "mcp-agent-dashboard"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "model_artifacts" {
  bucket = aws_s3_bucket.model_artifacts.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "model_artifacts" {
  bucket = aws_s3_bucket.model_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "model_artifacts" {
  bucket = aws_s3_bucket.model_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "logs_backup" {
  bucket = "mcp-agent-logs-backup-${data.aws_caller_identity.current.account_id}"

  tags = {
    Project     = "mcp-agent-dashboard"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_versioning" "logs_backup" {
  bucket = aws_s3_bucket.logs_backup.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs_backup" {
  bucket = aws_s3_bucket.logs_backup.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs_backup" {
  bucket = aws_s3_bucket.logs_backup.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
