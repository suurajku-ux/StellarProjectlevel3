import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { describe, it, expect, vi } from 'vitest';

// Mock the stellar utils
vi.mock('./utils/stellar', () => ({
  isConnected: vi.fn().mockResolvedValue(false),
  getPublicKey: vi.fn().mockResolvedValue('GATMWRXXLMGIP356DLH2VKPRC2CPCMHLIT62WFA4IQLXPFURRNYSLYYK'),
  getCampaignsRegistry: vi.fn().mockResolvedValue([]),
  getCampaignDetails: vi.fn().mockResolvedValue(null),
}));

describe('App Component', () => {
  it('renders the branding title', () => {
    render(<App />);
    expect(screen.getByText('PledgeVault')).toBeInTheDocument();
  });

  it('renders connect wallet button initially', () => {
    render(<App />);
    expect(screen.getByText(/Connect Freighter/i)).toBeInTheDocument();
  });

  it('shows no campaigns message when registry is empty', async () => {
    render(<App />);
    expect(await screen.findByText('No campaigns yet')).toBeInTheDocument();
  });

  it('opens create campaign modal', async () => {
    render(<App />);
    const createBtn = screen.getByText('Create Campaign');
    fireEvent.click(createBtn);
    
    expect(screen.getByText('Start a Campaign')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('E.g., Open Source Wallet')).toBeInTheDocument();
  });
});
