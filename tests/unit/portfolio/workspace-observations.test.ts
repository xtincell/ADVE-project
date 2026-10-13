import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({nodes:vi.fn(),strategies:vi.fn(),signals:vi.fn(),access:vi.fn(),sources:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{brandNode:{findMany:mocks.nodes},strategy:{findMany:mocks.strategies},signal:{findMany:mocks.signals}}}));
vi.mock("@/server/services/operator-isolation",()=>({canAccessStrategy:mocks.access}));
vi.mock("@/server/services/ingestion-pipeline/source-usage",()=>({listBrandSourceSummaries:mocks.sources}));
import {getPortfolioWorkspace} from "@/server/services/brand-node/workspace";
const root={id:"node-a",name:"Brand A",slug:"brand-a",operatorId:"op-a",strategyId:"brand-a",parentNodeId:null,sourceRefs:null};
const actor={userId:"actor-a",role:"USER"};
const observation={id:"signal-a",strategyId:"brand-a",type:"EXTERNAL_METRIC",createdAt:new Date("2026-10-14T01:00:00Z"),data:{sourceType:"QUIZ",sourceLabel:"Quiz déclaré",observationId:"quiz:receipt-a",sourceVersion:"palais-6-radar-v1",observedAt:"2026-10-13T23:00:00.000Z",metrics:[{metric:"Q6 · Ton radar · Personne ne connaît encore",value:1}]}};
beforeEach(()=>{vi.clearAllMocks();mocks.nodes.mockResolvedValue([root,{...root,id:"node-b",name:"Brand B",strategyId:"brand-b",parentNodeId:root.id}]);mocks.access.mockImplementation(async(id:string)=>id==="brand-a");mocks.strategies.mockResolvedValue([{id:"brand-a",name:"Brand A",status:"ACTIVE",pillars:[],brandAssets:[],campaigns:[]}]);mocks.sources.mockResolvedValue([]);mocks.signals.mockResolvedValue([observation]);});
describe("received observations in the existing portfolio reader",()=>{
 it("reads only authorized dossiers before the bound and retains the full sixth question",async()=>{
  const result=await getPortfolioWorkspace(root as never,{allowBarre:false,actor:actor as never});
  expect(mocks.signals).toHaveBeenCalledWith(expect.objectContaining({where:{strategyId:{in:["brand-a"]},type:"EXTERNAL_METRIC"},take:10,orderBy:{createdAt:"desc"}}));
  expect(result).toHaveProperty("observations.0.strategyId","brand-a");
  expect(result).toHaveProperty("observations.0.observation",expect.stringContaining("Q6 · Ton radar · Personne ne connaît encore : 1."));
  expect(result).toHaveProperty("observations.0.observedAt",new Date("2026-10-13T23:00:00Z"));
  expect(result).toHaveProperty("observations.0.receivedAt",observation.createdAt);
 });
 it("does not read signals when none of the related dossiers is authorized",async()=>{
  mocks.access.mockResolvedValue(false);mocks.strategies.mockResolvedValue([]);
  const result=await getPortfolioWorkspace(root as never,{allowBarre:false,actor:actor as never});
  expect(mocks.signals).not.toHaveBeenCalled();expect(result).toHaveProperty("observations",[]);
 });
 it("keeps missing observation time unknown rather than using reception time",async()=>{
  mocks.signals.mockResolvedValue([{...observation,data:{sourceType:"QUIZ",metrics:[{metric:"Cartes historiques",value:27}]}}]);
  const result=await getPortfolioWorkspace(root as never,{allowBarre:false,actor:actor as never});
  expect(result).toHaveProperty("observations.0.observedAt",null);
  expect(result).toHaveProperty("observations.0.observation",expect.stringContaining("Date d'observation inconnue."));
 });
 it("does not turn a failed source read into an empty result",async()=>{
  mocks.signals.mockRejectedValue(new Error("observation storage unavailable"));
  await expect(getPortfolioWorkspace(root as never,{allowBarre:false,actor:actor as never})).rejects.toThrow("observation storage unavailable");
 });
});
