'use client';

import { useState, useEffect } from 'react';
import { fetchAgents, updateRoomTopicAction } from '@/server/actions';
import { Tweet, Contract, Agent } from './AgentStats';
import { callPerplexity } from '@/server/actions';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
// import { updateRoomTopic } from '@/server/store';

async function createAgentTopic(agent: Agent): Promise<string> {
  console.log('Creating topic for agent:', agent.agentName);
  
  // First create the base metrics string
  const metricsString = `Analyzing ${agent.agentName} (${agent.twitterUsernames.join(', ')}):
Price: $${agent.price.toFixed(4)} (${agent.priceDeltaPercent > 0 ? '+' : ''}${agent.priceDeltaPercent.toFixed(2)}%) | 
MCap: $${(agent.marketCap / 1000000).toFixed(2)}M (${agent.marketCapDeltaPercent > 0 ? '+' : ''}${agent.marketCapDeltaPercent.toFixed(2)}%) | 
Vol: $${(agent.volume24Hours / 1000000).toFixed(2)}M (${agent.volume24HoursDeltaPercent > 0 ? '+' : ''}${agent.volume24HoursDeltaPercent.toFixed(2)}%) | 
${agent.holdersCount.toLocaleString()} holders (${agent.holdersCountDeltaPercent > 0 ? '+' : ''}${agent.holdersCountDeltaPercent.toFixed(2)}%) | 
Mindshare: ${agent.mindshare.toFixed(2)} (${agent.mindshareDeltaPercent > 0 ? '+' : ''}${agent.mindshareDeltaPercent.toFixed(2)}%) | 
${agent.followersCount.toLocaleString()} followers (${agent.smartFollowersCount.toLocaleString()} smart) | 
Avg Engagements: ${agent.averageEngagementsCount.toFixed(1)} (${agent.averageEngagementsCountDeltaPercent > 0 ? '+' : ''}${agent.averageEngagementsCountDeltaPercent.toFixed(2)}%)`;

  console.log('Base metrics string:', metricsString);

  try {
    // Query Perplexity about the agent
    const prompt = `What is ${agent.agentName} and who is ${agent.twitterUsernames.join(', ')}? Focus on their role in crypto/web3. Be concise.`;
    console.log('Sending prompt to Perplexity:', prompt);
    
    const result = await callPerplexity(prompt);
    console.log('Perplexity raw response:', result);
    
    const aiResponse = result.choices[0].message.content;
    console.log('AI response content:', aiResponse);

    // Combine metrics with AI insights
    const finalTopic = `${metricsString}\n\nContext: ${aiResponse}`;
    console.log('Final topic:', finalTopic);
    
    return finalTopic;
  } catch (error) {
    console.error('Error getting AI context:', error);
    console.log('Falling back to base metrics');
    return metricsString; // Fallback to just metrics if AI fails
  }
}

function TruncatedTopic({ topic }: { topic: string }) {
  // Split into metrics and context
  const [metrics, context] = topic.split('\n\nContext: ');
  
  // Truncate metrics to first line
  const truncatedMetrics = metrics.split('\n')[0];
  
  // Create shortened display version
  const displayText = context 
    ? `${truncatedMetrics} (hover for details)` 
    : truncatedMetrics;

  return (
    <TooltipProvider>
    <Tooltip delayDuration={300}>
      <TooltipTrigger className="max-w-full truncate">
        {displayText}
      </TooltipTrigger>
      <TooltipContent className="max-w-[500px] p-4 text-sm whitespace-pre-wrap">
        {topic}
      </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}

export default function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentTopic, setCurrentTopic] = useState<string>('');

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const data = await fetchAgents(currentPage);
        setAgents(data.ok.data);
      } catch (error) {
        console.error('Error loading agents:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAgents();
  }, [currentPage]);

  useEffect(() => {
    const checkCurrentTopic = async () => {
      try {
        const response = await fetch('api/rooms/cookiedelphia');
        const data = await response.json();
        
        // Extract agent name from topic
        const match = data.room.topic.match(/Analyzing ([^(]+)/);
        if (match) {
          const agentName = match[1].trim();
          setSelectedAgent(agentName);
        }
      } catch (error) {
        console.error('Error checking current topic:', error);
      }
    };

    checkCurrentTopic();
  }, []);

  const handleAgentClick = async (agent: Agent) => {
    try {
      setSelectedAgent(agent.agentName);
      const topic = await createAgentTopic(agent);
      setCurrentTopic(topic);
      await updateRoomTopicAction('cookiedelphia', topic);
    } catch (error) {
      console.error('Error updating topic:', error);
    }
  };

  if (loading) return <div>Loading agents...</div>;

  return (
    <div className="space-y-4">
      {currentTopic && (
        <div className="mb-4 p-2 bg-muted rounded">
          <TruncatedTopic topic={currentTopic} />
        </div>
      )}
      <h2 className="text-xl font-bold">Agents</h2>
      <div className="space-y-2">
        {agents.map((agent) => (
          <button
            key={agent.agentName}
            onClick={() => handleAgentClick(agent)}
            className={`w-full p-2 text-left rounded hover:bg-primary/10 transition-colors
              ${selectedAgent === agent.agentName 
                ? 'bg-primary/20 ring-1 ring-primary' 
                : ''
              }`}
          >
            <div className="font-medium">{agent.agentName}</div>
            <div className="text-sm text-muted-foreground">
              ${agent.price.toFixed(4)} | ${(agent.marketCap / 1000000).toFixed(2)}M
            </div>
            <div className="text-xs text-muted-foreground">
              {agent.holdersCount.toLocaleString()} holders
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}