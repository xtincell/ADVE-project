/** Signed adapter for an existing channel bridge; public clients use their private conversation link. */
export const dynamic='force-dynamic';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {db} from '@/lib/db';
import {recordInboundSalesMessage} from '@/server/services/crm-engine/fleet';
const envelope=z.object({dealId:z.string(),externalId:z.string().min(1).max(200),channel:z.enum(['EMAIL','WHATSAPP','PHONE','SMS','SOCIAL']),sender:z.string().min(1).max(240),body:z.string().trim().min(1).max(12000),subject:z.string().max(200).optional(),timestamp:z.number().int()});
export async function POST(request:Request){
 const secret=process.env.SALES_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:'Channel bridge is not configured'},{status:503});
 const raw=await request.text();if(raw.length>20000)return NextResponse.json({error:'Payload too large'},{status:413});
 const provided=request.headers.get('x-webhook-signature')?.replace(/^sha256=/,'')??'';const expected=createHmac('sha256',secret).update(raw).digest('hex');
 if(!/^[a-f0-9]{64}$/i.test(provided)||!timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(provided,'hex')))return NextResponse.json({error:'Unauthorized'},{status:401});
 try{const input=envelope.parse(JSON.parse(raw));if(Math.abs(Date.now()-input.timestamp)>300000)return NextResponse.json({error:'Expired event'},{status:401});
 const deal=await db.deal.findUniqueOrThrow({where:{id:input.dealId}});
 const match=input.channel==='EMAIL'?deal.contactEmail?.toLowerCase()===input.sender.toLowerCase():deal.contactPhone?.replace(/\s+/g,'')===input.sender.replace(/\s+/g,'');
 if(!match)return NextResponse.json({error:'Sender does not match the sales contact'},{status:403});
 await recordInboundSalesMessage(input);return NextResponse.json({received:true});
 }catch{return NextResponse.json({error:'Event refused'},{status:400});}
}
