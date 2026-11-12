import type {Metadata} from 'next';
import {SalesCustomerChat} from '@/components/console/sales-customer-chat';
export const metadata:Metadata={title:'Votre conversation commerciale',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function SalesConversation({params}:{params:Promise<{token:string}>}){return <SalesCustomerChat token={(await params).token}/>;}
