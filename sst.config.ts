/// <reference path="./.sst/platform/config.d.ts" />
// @ts-nocheck — SST globals ($config, sst.*) are auto-generated`

/**
 * SST v3 (Ion) — Infrastructure as Code for AWS ECS Fargate Deployment
 * =====================================================================
 *
 * This config file defines the entire AWS infrastructure needed to run
 * the multi-tenant payment platform in production. SST v3 uses Pulumi
 * under the hood (not CloudFormation), giving faster deploys and real
 * programming constructs.
 *
 * WHAT SST PROVISIONS UNDER THE HOOD :
 * ───────────────────────────────────────────────
 *
 * 1. VPC (Virtual Private Cloud)
 *    └── Creates an isolated network in AWS with:
 *        ├── 2 Public Subnets (across 2 AZs for high availability)
 *        │   └── ALB sits here — internet-facing, receives HTTP traffic
 *        ├── 2 Private Subnets (across 2 AZs)
 *        │   └── Fargate tasks run here — no direct internet access
 *        └── Route Tables (traffic rules for each subnet)
 *
 * 2. Security Groups (firewall rules)
 *    ├── ALB Security Group
 *    │   └── Inbound: Port 80 (HTTP) from 0.0.0.0/0 (public internet)
 *    │   └── Inbound: Port 443 (HTTPS) from 0.0.0.0/0 (if domain added)
 *    └── ECS Service Security Group
 *        └── Inbound: Port 3000 ONLY from ALB Security Group
 *            (Fargate containers are NOT publicly accessible)
 *
 * 3. ECR Repository (Elastic Container Registry)
 *    └── SST builds the Docker image locally, pushes it to ECR,
 *        and Fargate pulls from ECR to start containers.
 *        Image tag is a content hash — immutable deployments.
 *
 * 4. ECS Cluster
 *    └── Logical grouping of Fargate tasks. No EC2 instances to manage.
 *        AWS handles the underlying compute infrastructure entirely.
 *
 * 5. ECS Task Definition
 *    └── Blueprint for the container:
 *        ├── CPU: 0.25 vCPU, Memory: 0.5 GB (minimum Fargate size)
 *        ├── Container image: pulled from ECR
 *        ├── Port mapping: container port 3000
 *        ├── Environment variables: MONGODB_URI, REDIS_URL, JWT_SECRET, etc.
 *        ├── Log configuration: sends stdout/stderr to CloudWatch Logs
 *        └── Health check: wget to /api/health every 30s
 *
 * 6. ECS Service
 *    └── Ensures the desired number of tasks are always running:
 *        ├── Desired count: 1 (can scale with auto-scaling rules)
 *        ├── Deployment: rolling update (zero-downtime deploys)
 *        ├── Capacity: Fargate Spot (~50% cheaper, fine for demo)
 *        └── Connects to ALB via Target Group
 *
 * 7. Application Load Balancer (ALB)
 *    └── Distributes HTTP traffic to Fargate containers:
 *        ├── Listener: Port 80 → forwards to Target Group on port 3000
 *        ├── Target Group: health checks on /api/health
 *        │   └── Healthy threshold: 2 consecutive 200s
 *        │   └── Unhealthy threshold: 3 consecutive failures
 *        │   └── Interval: 30 seconds
 *        └── Outputs a public DNS name (e.g., Payme-xxx.ap-south-1.elb.amazonaws.com)
 *
 * 8. CloudWatch Logs
 *    └── Log group with 1-week retention for container stdout/stderr.
 *        All console.log, NestJS logger output goes here.
 *
 * 9. IAM Roles (auto-created by SST)
 *    ├── Task Execution Role: allows ECS to pull images from ECR,
 *    │   push logs to CloudWatch, and read secrets
 *    └── Task Role: the role the running container assumes
 *        (can be extended for S3, SQS, etc.)
 *
 * 10. ACM Certificate (only when custom domain is added)
 *     └── Free SSL/TLS certificate from AWS Certificate Manager
 *         Supports wildcard: *.yourdomain.com for tenant subdomains
 *         Validated automatically via Route 53 DNS records
 *
 * 11. Route 53 DNS Records (only when custom domain is added)
 *     ├── A record: yourdomain.com → ALB
 *     └── A record: *.yourdomain.com → ALB (wildcard for tenant subdomains)
 *
 
 *
 * DEPLOY:   npx sst deploy --stage prod
 * TEARDOWN: npx sst remove --stage prod   
 */

export default $config({
  app(input) {
    return {
      name: "payment-platform",
      // "remove" deletes all resources on `sst remove`; "retain" keeps data
      removal: input?.stage === "prod" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          region: "ap-south-1",
        },
      },
    };
  },
  async run() {
    // Load .env (same file used for local development)
    await import("dotenv/config");

    const mongoUri = process.env.MONGODB_URI!;
    const redisUrl = process.env.REDIS_URL!;
    const jwtSecret = process.env.JWT_SECRET!;
    const baseDomain = process.env.BASE_DOMAIN || "localhost";

    // ─── VPC: Isolated network with public + private subnets ───
    const vpc = new sst.aws.Vpc("PaymentVpc");

    // ─── ECS Cluster: Logical grouping for Fargate tasks ───
    const cluster = new sst.aws.Cluster("PaymentCluster", { vpc });

    // ─── Fargate Service: Container + ALB ───
    const service = new sst.aws.Service("PaymentApi", {
      cluster,

      capacity: "spot",

      cpu: "0.25 vCPU",
      memory: "0.5 GB",

      // SST builds this Dockerfile, pushes to ECR, and deploys to Fargate
      image: {
        dockerfile: "Dockerfile",
      },

      // These become container environment variables in the Task Definition
      environment: {
        NODE_ENV: "production",
        PORT: "3000",
        BASE_DOMAIN: baseDomain,
        MONGODB_URI: mongoUri,
        REDIS_URL: redisUrl,
        JWT_SECRET: jwtSecret,
      },

      // ECS-level health check (container health)
      health: {
        command: ["CMD-SHELL", "wget -q --spider http://localhost:3000/api/health || exit 1"],
        startPeriod: "30 seconds",
        interval: "30 seconds",
        retries: 3,
      },

      logging: {
        retention: "1 week",
      },

      // ALB: internet-facing load balancer in public subnets
      loadBalancer: {
        rules: [
          { listen: "80/http", forward: "3000/http" },
        ],

        // ALB-level health check (target group health)
        health: {
          path: "/api/health",
          interval: "30 seconds",
          healthyThreshold: 2,
        },

     
      },

      // In `sst dev`, runs the app locally instead of deploying containers
      dev: {
        command: "npm run start:dev",
      },
    });

    return {
      url: service.url,
    };
  },
});
