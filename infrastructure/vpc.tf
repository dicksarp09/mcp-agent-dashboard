module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "mcp-agent-vpc"
  cidr = var.vpc_cidr

  azs             = [var.availability_zone]
  public_subnets  = [var.public_subnet_cidr]
  private_subnets = [var.private_subnet_cidr]

  enable_nat_gateway               = true
  single_nat_gateway               = true
  enable_dns_hostnames             = true
  enable_dns_support               = true
  create_igw                        = true
  one_nat_gateway_per_az           = false

  tags = {
    Project     = "mcp-agent-dashboard"
    Environment = var.environment
  }
}
