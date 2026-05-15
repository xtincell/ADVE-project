// Argos test server — serves the HTML harness + mocks (or proxies) the Anthropic API.
// Run: node server.mjs
// Open: http://localhost:5173

import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 5174;

// Optional: forward to real Anthropic API if a key is set in env. Otherwise mock.
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const USE_MOCK = ANTHROPIC_KEY.length === 0;

console.log(USE_MOCK
  ? '⚠ No ANTHROPIC_API_KEY in env — running with MOCK responses.'
  : '✓ Forwarding /api/anthropic to api.anthropic.com (real calls).');

// ─────────────────────────────────────────────────────────────────────────────
// Mock responses per phase. Each simulates a tool_use block (the new fixed pattern)
// for phase 1, and text-with-JSON for phases 2-4 (the legacy pattern, so we can
// verify both code paths work).
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_PHASE_1 = {
  id: 'msg_mock_1',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-5',
  stop_reason: 'tool_use',
  content: [
    { type: 'text', text: 'I will search for this campaign now...' },
    {
      type: 'server_tool_use',
      id: 'srvtoolu_mock_1',
      name: 'web_search',
      input: { query: 'Apple Think Different 1997 Steve Jobs Here\'s to the crazy ones' }
    },
    {
      type: 'web_search_tool_result',
      tool_use_id: 'srvtoolu_mock_1',
      content: [
        { type: 'web_search_result', url: 'https://en.wikipedia.org/wiki/Think_different', title: 'Think different - Wikipedia' },
        { type: 'web_search_result', url: 'https://www.thecrazyones.it/', title: 'The Crazy Ones - Original 1997 commercial' }
      ]
    },
    {
      type: 'tool_use',
      id: 'toolu_mock_1',
      name: 'submit_phase_output',
      input: {
        queryInterpretation: 'User is asking about the 1997 Apple campaign featuring the "Here\'s to the crazy ones" manifesto.',
        resolvedAssetUrl: 'https://www.thecrazyones.it/',
        campaign: {
          brand: 'Apple',
          year: 1997,
          slug: 'think-different',
          title: 'Think Different',
          agency: 'TBWA\\Chiat\\Day',
          markets: ['US', 'WW'],
          confidence: 'high',
          sources: [
            { sourceUrl: 'https://en.wikipedia.org/wiki/Think_different', excerpt: 'Think different is an advertising slogan used from 1997 to 2002 by Apple Computer, Inc.' }
          ],
          notes: null
        },
        sidecarFindings: [
          {
            targetType: 'campaign',
            targetCreateHints: { brand: 'IBM', campaign: 'think', year: 1962, assetId: null, kind: null },
            finding: {
              type: 'context',
              content: 'Think Different was a direct response to IBM\'s decades-old "Think" slogan.',
              sourceUrl: 'https://en.wikipedia.org/wiki/Think_different',
              excerpt: 'The slogan was created as a response to IBM\'s slogan Think.'
            }
          }
        ]
      }
    }
  ],
  usage: { input_tokens: 1234, output_tokens: 567 }
};

const MOCK_PHASE_2 = {
  id: 'msg_mock_2',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-5',
  stop_reason: 'tool_use',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_mock_2',
      name: 'submit_phase_output',
      input: {
        assets: [
          {
            id: 'heres-to-the-crazy-ones',
            kind: 'text',
            function: 'tagline',
            url: null,
            dna: {
              tone: 'reverent, poetic, defiant',
              structure: 'enumeration of archetypes + closing imperative',
              keyPhrases: ['Here\'s to the crazy ones', 'the misfits', 'the rebels', 'the round pegs in the square holes', 'the ones who see things differently'],
              length: 'long',
              voice: 'second-person collective, addressing both the subjects and the viewer'
            },
            sources: [{ sourceUrl: 'https://www.thecrazyones.it/', excerpt: 'Here\'s to the crazy ones. The misfits. The rebels. The troublemakers.' }]
          },
          {
            id: 'crazy-ones-tvc-60s',
            kind: 'video',
            function: 'tvc',
            url: 'https://www.youtube.com/watch?v=cFEarBzelBs',
            dna: {
              durationSec: 60,
              structure: 'black & white archive footage of 17 iconic figures, set to voiceover',
              music: 'minimal piano, building to crescendo at "they push the human race forward"',
              voiceover: 'Richard Dreyfuss (original 1997 version) reading the manifesto',
              scenes: ['Einstein writing equations', 'Dylan with guitar', 'MLK at podium', 'Lennon and Yoko', 'Edison with lightbulb', 'Muhammad Ali', 'Hitchcock directing', 'Picasso at canvas'],
              pacing: 'slow'
            },
            sources: [{ sourceUrl: 'https://en.wikipedia.org/wiki/Think_different', excerpt: 'The text was read by Richard Dreyfuss in the original 1997 television commercial.' }]
          },
          {
            id: 'einstein-portrait',
            kind: 'image',
            function: 'print',
            url: 'https://upload.wikimedia.org/...',
            dna: {
              composition: 'centered portrait, tight crop on face, looking left',
              palette: ['#FFFFFF', '#000000', '#888888'],
              typography: 'Apple Garamond, italic, Think different. lowercase',
              subjects: ['Albert Einstein'],
              mood: 'reverent, timeless, monochrome',
              visualCodes: ['black & white photography', 'minimal type', 'logo-as-signature']
            },
            sources: [{ sourceUrl: 'https://en.wikipedia.org/wiki/Think_different', excerpt: 'Posters featuring black-and-white portraits of iconic figures.' }]
          }
        ],
        sidecarFindings: []
      }
    }
  ],
  usage: { input_tokens: 2345, output_tokens: 1234 }
};

const MOCK_PHASE_3 = {
  id: 'msg_mock_3',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-5',
  stop_reason: 'tool_use',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_mock_3',
      name: 'submit_phase_output',
      input: {
        axes: [
          {
            name: 'Brand-tribe reframing',
            description: 'Apple repositions itself from product seller to standard-bearer for a worldview, addressing "the crazy ones" as a tribe rather than a market.',
            evidence: [{ sourceUrl: 'https://en.wikipedia.org/wiki/Think_different', excerpt: 'The campaign was designed to inspire customers and re-energize Apple\'s lapsed brand image.' }]
          },
          {
            name: 'Promise inversion',
            description: 'Standard tech advertising shows the product enabling the user. Think Different shows the user (icon) without ever showing the product.',
            evidence: [{ sourceUrl: 'https://www.thecrazyones.it/', excerpt: 'No products appear in the original commercial.' }]
          }
        ],
        performance: [
          {
            metric: 'Stock price recovery',
            value: 'Apple stock tripled within 12 months of campaign launch',
            evidenceLevel: 'REPORTED',
            sources: [{ sourceUrl: 'https://en.wikipedia.org/wiki/Think_different', excerpt: 'Apple\'s stock price tripled within twelve months of the slogan\'s introduction.' }]
          }
        ],
        victories: [
          {
            type: 'award',
            title: 'Emmy Award for Outstanding Commercial',
            year: 1998,
            sources: [{ sourceUrl: 'https://en.wikipedia.org/wiki/Think_different', excerpt: 'Won the Emmy Award for Best Commercial in 1998.' }]
          }
        ],
        sidecarFindings: []
      }
    }
  ],
  usage: { input_tokens: 3456, output_tokens: 890 }
};

const MOCK_PHASE_4 = {
  id: 'msg_mock_4',
  type: 'message',
  role: 'assistant',
  model: 'claude-sonnet-4-5',
  stop_reason: 'tool_use',
  content: [
    {
      type: 'tool_use',
      id: 'toolu_mock_4',
      name: 'submit_phase_output',
      input: {
        editorial: {
          summary: 'Apple\'s 1997 Think Different campaign re-anchors the brand on a manifesto of iconic dissent. By celebrating cultural rebels without ever showing a product, TBWA\\Chiat\\Day inverts the standard tech-advertising contract — repositioning Apple as the tribe of misfits rather than a hardware vendor.',
          patternObservation: 'Across every asset, the brand promise is delivered through absence: no product appears, no claim is made, only icons of changed-the-world dissent. The viewer is asked to recognize themselves in the lineage.',
          significance: 'This is the textbook DEALER manipulation mode — emotional dependence built without overt sales pitch. Still cited 28 years later as the canonical brand-rescue case study.'
        },
        safety: {
          verdict: 'PASS',
          reasons: [],
          uncertainFields: []
        }
      }
    }
  ],
  usage: { input_tokens: 4567, output_tokens: 678 }
};

const MOCKS = { 1: MOCK_PHASE_1, 2: MOCK_PHASE_2, 3: MOCK_PHASE_3, 4: MOCK_PHASE_4 };

// Route the mock by parsing which phase the system prompt is for.
// The system prompt starts with "You are ARGOS HUNTER — Phase N: …"
function pickMockFromRequest(body) {
  try {
    const parsed = JSON.parse(body);
    const sys = parsed.system || '';
    const match = sys.match(/Phase\s+([1-4])/i);
    if (match) return MOCKS[Number(match[1])];
  } catch {}
  return MOCKS[1]; // fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP server
// ─────────────────────────────────────────────────────────────────────────────

const server = createServer(async (req, res) => {
  // CORS — local dev
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Anthropic API proxy / mock (Vite proxies /api/anthropic/* to this server)
  if (req.url === '/api/anthropic/v1/messages' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      if (USE_MOCK) {
        // Simulate latency
        await new Promise((r) => setTimeout(r, 800));
        const mock = pickMockFromRequest(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(mock));
      } else {
        try {
          const upstream = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': ANTHROPIC_KEY,
              'anthropic-version': '2023-06-01'
            },
            body
          });
          const text = await upstream.text();
          res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
          res.end(text);
        } catch (e) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: e.message }));
        }
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found: ' + req.url);
});

server.listen(PORT, () => {
  console.log(`▸ Argos test harness on http://localhost:${PORT}`);
  console.log(`  Mode: ${USE_MOCK ? 'MOCK (cycling phases 1→4)' : 'REAL ANTHROPIC API'}`);
});
