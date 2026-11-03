variable "environment" {
  type        = string
  description = "Environment name (staging or production)"
}

variable "kms_key_arn" {
  type        = string
  description = "KMS Key ARN for secret decryption"
  default     = null
}
