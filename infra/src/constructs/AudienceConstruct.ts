import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AudienceConstructProps {
  profileTable: dynamodb.Table;
  rawBucket: s3.Bucket;
}

export class AudienceConstruct extends Construct {
  constructor(scope: Construct, id: string, props: AudienceConstructProps) {
    super(scope, id);

    // VPC for Fargate tasks
    const vpc = new ec2.Vpc(this, 'AudienceVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'AudienceCluster', { vpc });

    // Task definition
    const taskDef = new ecs.FargateTaskDefinition(this, 'AudienceTaskDef', {
      memoryLimitMiB: 2048,
      cpu: 512,
    });

    props.profileTable.grantReadWriteData(taskDef.taskRole);
    props.rawBucket.grantRead(taskDef.taskRole);

    // Athena query permissions
    taskDef.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          'athena:StartQueryExecution',
          'athena:GetQueryExecution',
          'athena:GetQueryResults',
          'glue:GetDatabase',
          'glue:GetTable',
          'glue:GetPartitions',
        ],
        resources: ['*'],
      })
    );

    taskDef.addContainer('AudienceBuilder', {
      image: ecs.ContainerImage.fromRegistry(
        'public.ecr.aws/uniflow/audience-builder:latest'
      ),
      environment: {
        PROFILE_TABLE_NAME: props.profileTable.tableName,
        RAW_BUCKET_NAME: props.rawBucket.bucketName,
        LOG_LEVEL: 'info',
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'audience-builder' }),
    });

    // EventBridge Scheduler role
    const schedulerRole = new iam.Role(this, 'SchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
    });

    schedulerRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['ecs:RunTask'],
        resources: [taskDef.taskDefinitionArn],
      })
    );

    taskDef.taskRole.grantPassRole(schedulerRole);
    if (taskDef.executionRole) {
      taskDef.executionRole.grantPassRole(schedulerRole);
    }

    // Hourly audience evaluation schedule
    new scheduler.CfnSchedule(this, 'AudienceSchedule', {
      scheduleExpression: 'rate(1 hour)',
      flexibleTimeWindow: { mode: 'OFF' },
      target: {
        arn: cluster.clusterArn,
        roleArn: schedulerRole.roleArn,
        ecsParameters: {
          taskDefinitionArn: taskDef.taskDefinitionArn,
          launchType: 'FARGATE',
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: vpc.privateSubnets.map((s) => s.subnetId),
              securityGroups: [],
              assignPublicIp: 'DISABLED',
            },
          },
        },
      },
    });
  }
}
