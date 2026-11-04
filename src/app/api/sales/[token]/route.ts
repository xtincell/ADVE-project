export const dynamic='force-dynamic';
import {NextResponse} from 'next/server';
import {ZodError} from 'zod';
import {TRPCError} from '@trpc/server';
import {customerConversation,customerSalesMessageSchema,receiveCustomerMessage} from '@/server/services/crm-engine/customer';
import {getPublicBaseUrl} from '@/server/services/oauth-integrations';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
function failure(error:unknown){
 const code=(error as {code?:string})?.code;
 const status=error instanceof ZodError||code==='BAD_REQUEST'?400:code==='TOO_MANY_REQUESTS'?429:code==='CONFLICT'?409:404;
 const message=status===400?'Vérifiez votre message avant de l’envoyer.':status===429?'Veuillez patienter avant un nouvel envoi.':status===409?'Cette proposition ou ce message a changé. Relisez la conversation avant de poursuivre.':'Conversation indisponible.';
 return NextResponse.json({error:message},{status,headers});
}
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){try{return NextResponse.json(await customerConversation((await params).token),{headers});}catch(error){return failure(error);}}
async function boundedJson(request:Request):Promise<unknown>{
 const reader=request.body?.getReader();if(!reader)throw new TRPCError({code:'BAD_REQUEST'});
 const chunks:Uint8Array[]=[];let bytes=0;
 while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>12000){await reader.cancel();throw new TRPCError({code:'BAD_REQUEST'});}chunks.push(chunk.value);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new TRPCError({code:'BAD_REQUEST'});}
}
export async function POST(request:Request,{params}:{params:Promise<{token:string}>}){
 if(request.headers.get('origin')&&request.headers.get('origin')!==getPublicBaseUrl(request))return NextResponse.json({error:'Origine refusée.'},{status:403,headers});
 if(!request.headers.get('content-type')?.includes('application/json'))return NextResponse.json({error:'Format de message invalide.'},{status:415,headers});
 if(Number(request.headers.get('content-length')??0)>12000)return NextResponse.json({error:'Message trop long.'},{status:413,headers});
 try {return NextResponse.json(await receiveCustomerMessage((await params).token,customerSalesMessageSchema.parse(await boundedJson(request))),{headers});}catch(error){return failure(error);}
}
