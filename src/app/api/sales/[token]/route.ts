export const dynamic='force-dynamic';
import {NextResponse} from 'next/server';
import {z} from 'zod';
import {customerConversation,receiveCustomerMessage} from '@/server/services/crm-engine/customer';
import {getPublicBaseUrl} from '@/server/services/oauth-integrations';
const message=z.object({body:z.string().trim().min(1).max(4000),requestId:z.string().uuid()});
function failure(error:unknown){const code=(error as {code?:string})?.code;return NextResponse.json({error:code==='TOO_MANY_REQUESTS'?'Veuillez patienter avant un nouvel envoi.':'Conversation indisponible.'},{status:code==='TOO_MANY_REQUESTS'?429:404,headers:{'Cache-Control':'no-store'}});}
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){try{return NextResponse.json(await customerConversation((await params).token),{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}catch(error){return failure(error);}}
export async function POST(request:Request,{params}:{params:Promise<{token:string}>}){
 if(request.headers.get('origin')&&request.headers.get('origin')!==getPublicBaseUrl(request))return NextResponse.json({error:'Origine refusée.'},{status:403});
 if(Number(request.headers.get('content-length')??0)>10000)return NextResponse.json({error:'Message trop long.'},{status:413});
 try {return NextResponse.json(await receiveCustomerMessage((await params).token,message.parse(await request.json())));}catch(error){return failure(error);}
}
