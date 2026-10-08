import Redis from "ioredis";
import { Queue, Worker } from "bullmq";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT || "16379");
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

async function main() {
  console.log("==================================================================");
  console.log("             ACTION 2: VALKEY 8.0.2 & BULLMQ VERIFICATION        ");
  console.log("==================================================================\n");

  const connection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    maxRetriesPerRequest: null,
  };

  // 1. ioredis PING -> PONG test
  console.log(`1. Connecting ioredis to Valkey at ${REDIS_HOST}:${REDIS_PORT}...`);
  const redis = new Redis(connection);

  const pingResult = await redis.ping();
  console.log(`   ioredis.ping() returned: "${pingResult}"`);
  if (pingResult !== "PONG") {
    throw new Error(`Expected PONG, got ${pingResult}`);
  }

  // 2. Key-Value read/write test
  const testKey = `valkey:test:${Date.now()}`;
  await redis.set(testKey, "HaiHire-Valkey-Compatibility-OK", "EX", 60);
  const fetchedVal = await redis.get(testKey);
  console.log(`   Valkey set/get verified: "${fetchedVal}"`);
  if (fetchedVal !== "HaiHire-Valkey-Compatibility-OK") {
    throw new Error("Key-value read/write verification failed");
  }

  // 3. BullMQ Queue & Worker Push/Pull Test
  console.log("\n2. Initializing BullMQ Queue & Worker on Valkey...");
  const queueName = `test-valkey-queue-${Date.now()}`;
  const queue = new Queue(queueName, { connection });

  let jobReceived = false;
  let jobDataResult = "";

  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(`   [BullMQ Worker] Processing Job ID: ${job.id}, Name: ${job.name}`);
      jobReceived = true;
      jobDataResult = job.data.message;
      return { status: "processed", processedAt: new Date().toISOString() };
    },
    { connection }
  );

  console.log("   Dispatching test job to BullMQ queue...");
  const testJob = await queue.add("send-test-email", {
    message: "Valkey BullMQ Engine Success",
    timestamp: Date.now(),
  });
  console.log(`   Job dispatched: ID ${testJob.id}`);

  // Wait for worker to process job
  let attempts = 0;
  while (!jobReceived && attempts < 20) {
    await new Promise((r) => setTimeout(r, 200));
    attempts++;
  }

  if (!jobReceived || jobDataResult !== "Valkey BullMQ Engine Success") {
    throw new Error("BullMQ Worker failed to receive or process job within timeout");
  }

  console.log(`   [BullMQ Success] Job verified: "${jobDataResult}"`);

  // Cleanup
  await worker.close();
  await queue.drain();
  await queue.close();
  await redis.del(testKey);
  await redis.quit();

  console.log("\n==================================================================");
  console.log("   [VERIFICATION PASSED] Valkey 8 + ioredis + BullMQ 100% OK!   ");
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
