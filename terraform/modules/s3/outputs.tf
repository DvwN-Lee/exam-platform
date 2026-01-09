# =============================================================================
# S3 Module Outputs
# =============================================================================

output "bucket_id" {
  description = "ID of the S3 bucket"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.main.arn
}

output "bucket_domain_name" {
  description = "Domain name of the bucket"
  value       = aws_s3_bucket.main.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "Regional domain name of the bucket"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

output "bucket_region" {
  description = "Region of the bucket"
  value       = aws_s3_bucket.main.region
}

output "cloudfront_oai_id" {
  description = "ID of the CloudFront Origin Access Identity"
  value       = var.create_cloudfront_oai ? aws_cloudfront_origin_access_identity.main[0].id : null
}

output "cloudfront_oai_iam_arn" {
  description = "IAM ARN of the CloudFront Origin Access Identity"
  value       = var.create_cloudfront_oai ? aws_cloudfront_origin_access_identity.main[0].iam_arn : null
}

output "cloudfront_oai_path" {
  description = "Path of the CloudFront Origin Access Identity"
  value       = var.create_cloudfront_oai ? aws_cloudfront_origin_access_identity.main[0].cloudfront_access_identity_path : null
}

# Django static files URL
output "static_url" {
  description = "URL for static files"
  value       = "https://${aws_s3_bucket.main.bucket_regional_domain_name}"
}
