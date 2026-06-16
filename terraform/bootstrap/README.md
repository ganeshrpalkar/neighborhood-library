# Terraform state bootstrap

Creates the S3 bucket and DynamoDB lock table that store the **main** stack's
remote state. Run this once, before configuring `../backend.tf`.

```bash
cd terraform/bootstrap
terraform init
terraform apply -var "state_bucket_name=library-tfstate-$(aws sts get-caller-identity --query Account --output text)"

# Copy the printed backend block into ../backend.tf:
terraform output -raw backend_config
```

Then in `terraform/`:

```bash
cp backend.tf.example backend.tf   # (or paste the output above)
terraform init                     # migrates state into S3
```

This bootstrap uses **local state** (a `terraform.tfstate` here, gitignored).
You rarely need to touch it again; leave it in place so the bucket/table aren't
orphaned. Do not run `terraform destroy` here while the main stack's state still
lives in the bucket.
