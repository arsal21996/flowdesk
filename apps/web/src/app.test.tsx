import {describe,it,expect,vi,beforeEach} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {BrowserRouter} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {Login} from './testExports';

describe('FlowDesk UI',()=>{
 beforeEach(()=>{localStorage.clear();vi.restoreAllMocks()});
 const renderLogin=()=>render(<QueryClientProvider client={new QueryClient()}><BrowserRouter><Login/></BrowserRouter></QueryClientProvider>);
 it('renders sign-in heading',()=>{renderLogin();expect(screen.getByText('Welcome back')).toBeInTheDocument()});
 it('renders email field',()=>{renderLogin();expect(screen.getByLabelText('Email')).toBeInTheDocument()});
 it('renders password field',()=>{renderLogin();expect(screen.getByLabelText('Password')).toHaveAttribute('type','password')});
 it('shows demo credentials',()=>{renderLogin();expect(screen.getByText(/demo@flowdesk.local/)).toBeInTheDocument()});
 it('allows typing credentials',async()=>{renderLogin();const u=userEvent.setup();const email=screen.getByLabelText('Email');await u.clear(email);await u.type(email,'person@example.com');expect(email).toHaveValue('person@example.com')});
});
