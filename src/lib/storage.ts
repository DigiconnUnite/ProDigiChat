// Cloud storage integration
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export async function uploadToS3(file: Express.Multer.File) {
  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is not defined");
  }
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: file.originalname,
    Body: file.buffer,
  };
  return s3.upload(params).promise();
}

export async function getFileFromS3(fileId: string) {
  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error("AWS_S3_BUCKET_NAME is not defined");
  }
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: fileId,
  };
  return s3.getObject(params).promise();
}