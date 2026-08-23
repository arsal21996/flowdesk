import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import { z } from 'zod';

export const db = new PrismaClient();
const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

type AuthReq = express.Request & { user?: { id: string; role: Role; name: string; email: string } };
const auth = (req: AuthReq, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try { req.user = jwt.verify(token, JWT_SECRET) as AuthReq['user']; next(); } catch { return res.status(401).json({ message: 'Invalid or expired token' }); }
};
const roles = (...allowed: Role[]) => (req: AuthReq, res: express.Response, next: express.NextFunction) => allowed.includes(req.user!.role) ? next() : res.status(403).json({ message: 'Insufficient permissions' });
const projectSchema = z.object({ name: z.string().trim().min(2).max(80), description: z.string().max(500).default(''), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1') });
const taskSchema = z.object({ title: z.string().trim().min(2).max(120), description: z.string().max(1000).default(''), status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO), priority: z.nativeEnum(Priority).default(Priority.MEDIUM), dueDate: z.string().datetime().nullable().optional(), projectId: z.string().min(1), assigneeId: z.string().nullable().optional() });

app.get('/health', (_req,res) => res.json({ ok: true }));
app.post('/api/auth/register', async (req,res) => { const parsed = z.object({ name:z.string().trim().min(2), email:z.string().email(), password:z.string().min(8) }).safeParse(req.body); if(!parsed.success) return res.status(400).json({message:'Invalid registration data'}); const {name,email,password}=parsed.data; if(await db.user.findUnique({where:{email}})) return res.status(409).json({message:'Email already registered'}); const user=await db.user.create({data:{name,email,passwordHash:await bcrypt.hash(password,12)}}); return res.status(201).json({user:{id:user.id,name:user.name,email:user.email,role:user.role}}); });
app.post('/api/auth/login', async (req,res) => { const parsed=z.object({email:z.string().email(),password:z.string().min(1)}).safeParse(req.body); if(!parsed.success)return res.status(400).json({message:'Invalid credentials'}); const user=await db.user.findUnique({where:{email:parsed.data.email}}); if(!user || !(await bcrypt.compare(parsed.data.password,user.passwordHash))) return res.status(401).json({message:'Invalid email or password'}); const token=jwt.sign({id:user.id,name:user.name,email:user.email,role:user.role},JWT_SECRET,{expiresIn:'7d'}); return res.json({token,user:{id:user.id,name:user.name,email:user.email,role:user.role}}); });
app.get('/api/auth/me',auth,(req:AuthReq,res)=>res.json({user:req.user}));

app.get('/api/projects',auth,async(req:AuthReq,res)=>{ const q=String(req.query.q||''); const projects=await db.project.findMany({where:q?{OR:[{name:{contains:q}},{description:{contains:q}}]}:undefined,include:{_count:{select:{tasks:true}}},orderBy:{updatedAt:'desc'}}); res.json({projects}); });
app.post('/api/projects',auth,roles(Role.ADMIN,Role.MANAGER),async(req:AuthReq,res)=>{const p=projectSchema.safeParse(req.body);if(!p.success)return res.status(400).json({message:'Invalid project data',issues:p.error.issues});const project=await db.project.create({data:{...p.data,ownerId:req.user!.id}});res.status(201).json({project});});
app.get('/api/projects/:id',auth,async(req,res)=>{const project=await db.project.findUnique({where:{id:req.params.id},include:{tasks:{include:{assignee:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'desc'}}}});if(!project)return res.status(404).json({message:'Project not found'});res.json({project});});
app.put('/api/projects/:id',auth,roles(Role.ADMIN,Role.MANAGER),async(req,res)=>{const p=projectSchema.partial().safeParse(req.body);if(!p.success)return res.status(400).json({message:'Invalid project data'});try{const project=await db.project.update({where:{id:req.params.id},data:p.data});res.json({project});}catch{res.status(404).json({message:'Project not found'});}});
app.delete('/api/projects/:id',auth,roles(Role.ADMIN),async(req,res)=>{try{await db.project.delete({where:{id:req.params.id}});res.status(204).send();}catch{res.status(404).json({message:'Project not found'});}});

app.get('/api/tasks',auth,async(req,res)=>{const q=String(req.query.q||'');const status=req.query.status as TaskStatus|undefined;const projectId=String(req.query.projectId||'');const tasks=await db.task.findMany({where:{...(q?{title:{contains:q}}:{}),...(status?{status}:{}),...(projectId?{projectId}:{})},include:{project:{select:{id:true,name:true,color:true}},assignee:{select:{id:true,name:true,email:true}}},orderBy:{updatedAt:'desc'}});res.json({tasks});});
app.post('/api/tasks',auth,async(req,res)=>{const p=taskSchema.safeParse(req.body);if(!p.success)return res.status(400).json({message:'Invalid task data',issues:p.error.issues});const {dueDate,...data}=p.data;try{const task=await db.task.create({data:{...data,dueDate:dueDate?new Date(dueDate):undefined}});res.status(201).json({task});}catch{res.status(400).json({message:'Project or assignee not found'});}});
app.get('/api/tasks/:id',auth,async(req,res)=>{const task=await db.task.findUnique({where:{id:req.params.id},include:{project:true,assignee:true}});if(!task)return res.status(404).json({message:'Task not found'});res.json({task});});
app.put('/api/tasks/:id',auth,async(req,res)=>{const p=taskSchema.partial().safeParse(req.body);if(!p.success)return res.status(400).json({message:'Invalid task data'});const {dueDate,...data}=p.data;try{const task=await db.task.update({where:{id:req.params.id},data:{...data,...(dueDate!==undefined?{dueDate:dueDate?new Date(dueDate):null}:{})}});res.json({task});}catch{res.status(404).json({message:'Task not found'});}});
app.delete('/api/tasks/:id',auth,async(req,res)=>{try{await db.task.delete({where:{id:req.params.id}});res.status(204).send();}catch{res.status(404).json({message:'Task not found'});}});

app.get('/api/dashboard',auth,async(_req,res)=>{const [projects,tasks,done,high]=await Promise.all([db.project.count(),db.task.count(),db.task.count({where:{status:TaskStatus.DONE}}),db.task.count({where:{priority:Priority.HIGH,status:{not:TaskStatus.DONE}}})]);res.json({stats:{projects,tasks,done,high},completion:tasks?Math.round(done/tasks*100):0});});
app.get('/api/users',auth,async(_req,res)=>res.json({users:await db.user.findMany({select:{id:true,name:true,email:true,role:true},orderBy:{name:'asc'}})}));

export default app;
if (process.env.NODE_ENV !== 'test') app.listen(Number(process.env.PORT)||4000,()=>console.log('FlowDesk API running on :4000'));
