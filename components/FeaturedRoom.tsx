"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatRoom, ChatMessage } from "@/server/types";
import { ChatWindow } from "./ChatWindow";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function TruncatedTopic({ topic }: { topic: string }) {
  // Split into metrics and context
  const [metrics, context] = topic.split('\n\nContext: ');
  
  // Truncate metrics to first line
  const truncatedMetrics = metrics?.split('\n')[0] || topic;
  
  // Create shortened display version
  const displayText = context 
    ? `${truncatedMetrics} (hover for details)` 
    : truncatedMetrics;

  return (
    <TooltipProvider>
    <Tooltip>
      <TooltipTrigger className="max-w-full truncate text-left">
        {displayText}
      </TooltipTrigger>
      <TooltipContent className="max-w-[500px] p-4 text-sm whitespace-pre-wrap">
        {topic}
      </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
}

export function FeaturedRoom() {
  const [room, setRoom] = useState<ChatRoom & { messages: ChatMessage[] } | null>(null);

  useEffect(() => {
    const fetchRandomRoom = async () => {
      try {
        const response = await fetch('/api/rooms');
        const data = await response.json();
        if (data.rooms?.length > 0) {
          const randomIndex = Math.floor(Math.random() * data.rooms.length);
          // const selectedRoom = data.rooms[randomIndex];
          const selectedRoom = data.rooms[0]; //cookiedelphia
          
          // Fetch messages for the selected room
          const messagesResponse = await fetch(`/api/rooms/${selectedRoom.id}/history`);
          const messagesData = await messagesResponse.json();
          
          setRoom({
            ...selectedRoom,
            messages: messagesData.messages || []
          });
        }
      } catch (error) {
        console.error("Failed to fetch rooms:", error);
      }
    };

    fetchRandomRoom();
  }, []);

  if (!room) {
    return (
      <Card className="w-full max-w-4xl mx-auto mb-8">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto mb-8">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div>
            <CardTitle className="text-2xl mb-2">Featured Conversation</CardTitle>
            <h2 className="text-xl font-mono font-semibold">{room.name}</h2>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="secondary" className="text-lg font-mono">
              {room.participants.length} 🤖
            </Badge>
            <Badge variant="outline" className="font-mono">
              {room.messageCount} 💬
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {room.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="text-muted-foreground mt-2">
          <TruncatedTopic topic={room.topic} />
        </div>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ChatWindow roomId={room.id} initialMessages={room.messages} />
      </CardContent>
    </Card>
  );
} 