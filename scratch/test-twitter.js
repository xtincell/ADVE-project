require("dotenv").config({ path: ".env.local" });

async function testTwitter() {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    console.log("No token.");
    return;
  }
  
  const query = "Apple";
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  const data = await res.json();
  console.log("Twitter Response:", data);
}

testTwitter().catch(console.error);
