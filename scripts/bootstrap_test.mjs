
import fetch from 'node-fetch';

const BASE = "http://localhost:3000/api/trpc";

async function rpc(procedure, input, method = "GET") {
  const isQuery = method === "GET";
  const url = isQuery
    ? `${BASE}/${procedure}?input=${encodeURIComponent(JSON.stringify({ "0": { json: input ?? {} } }))}&batch=1`
    : `${BASE}/${procedure}?batch=1`;

  const opts = {
    method: isQuery ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(isQuery ? {} : { body: JSON.stringify({ "0": { json: input ?? {} } }) }),
  };

  const res = await fetch(url, opts);
  return await res.json();
}

async function bootstrap() {
  console.log("Checking if users exist...");
  const hasUsers = await rpc("auth.hasUsers", {});
  const exists = hasUsers[0]?.result?.data?.json?.exists;

  if (!exists) {
    console.log("No users found. Performing initial setup...");
    const setup = await rpc("auth.setPin", {
      pin: "1234",
      restaurantName: "Deep Test Restaurant",
      name: "Deep Tester",
      phone: "1234567890"
    }, "POST");
    console.log("Setup result:", JSON.stringify(setup, null, 2));
  } else {
    console.log("Users already exist. Ready for tests.");
  }
}

bootstrap().catch(console.error);
