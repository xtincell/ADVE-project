// @vitest-environment jsdom
import React from "react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import ClientPage from "@/app/(agency)/agency/clients/[clientId]/page";
const record=vi.hoisted(()=>({strategies:[] as unknown[]}));
vi.mock("next/navigation",()=>({useRouter:()=>({}),useParams:()=>({clientId:"local"})}));
vi.mock("@/lib/trpc/client",()=>({trpc:{brandClient:{get:{useQuery:()=>({data:{
 name:"Client",status:"ACTIVE",organizationKind:"UNSPECIFIED",strategies:record.strategies,
}})}}}}));
vi.mock("@/components/shared/score-badge",()=>({ScoreBadge:({score}:{score:number})=>React.createElement("div",{role:"img","aria-label":`Score mesuré ${score}`})}));
beforeEach(()=>vi.stubGlobal("React",React));afterEach(cleanup);
const brand=(id:string,vector:unknown)=>({id,name:id,advertis_vector:vector,pillars:[],status:"ACTIVE"});
it("shows an unscored dossier without an invented zero or automatic tier",()=>{
 record.strategies=[brand("non évaluée",null)];
 render(React.createElement(ClientPage));
 expect(screen.queryByText("0/200")).toBeNull();
 expect(screen.queryByText("LATENT")).toBeNull();
 expect(screen.getByText("Non évaluée",{exact:true})).toBeTruthy();
 expect(screen.queryByRole("img",{name:"Score mesuré 0"})).toBeNull();
});
it("keeps a measured zero, includes it in the mean, and excludes a missing value",()=>{
 record.strategies=[brand("absente",null),brand("zéro",{composite:0}),brand("positive",{composite:100})];
 render(React.createElement(ClientPage));
 expect(screen.getByText("50/200")).toBeTruthy();
 expect(screen.getByRole("img",{name:"Score mesuré 0"})).toBeTruthy();
 expect(screen.getAllByText("LATENT")).toHaveLength(1);
});
