import { describe,it,expect } from 'vitest';
import request from 'supertest';
import app from './server';

describe('FlowDesk API',()=>{
 it('health endpoint works',async()=>{const r=await request(app).get('/health');expect(r.status).toBe(200);expect(r.body.ok).toBe(true)});
 it('rejects unauthenticated projects',async()=>{const r=await request(app).get('/api/projects');expect(r.status).toBe(401)});
 it('rejects invalid login',async()=>{const r=await request(app).post('/api/auth/login').send({email:'demo@flowdesk.local',password:'wrong'});expect(r.status).toBe(401)});
 it('rejects malformed login payload',async()=>{const r=await request(app).post('/api/auth/login').send({email:'not-an-email',password:''});expect(r.status).toBe(400)});
 it('rejects unauthenticated task creation',async()=>{const r=await request(app).post('/api/tasks').send({title:'test'});expect(r.status).toBe(401)});
 it('rejects malformed registration',async()=>{const r=await request(app).post('/api/auth/register').send({name:'A',email:'bad',password:'x'});expect(r.status).toBe(400)});
});
