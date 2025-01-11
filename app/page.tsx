import { getRooms, getMessages } from './actions';
import { RoomGrid } from '@/components/RoomGrid';
import { ThemeToggle } from '@/components/ThemeToggle';

export default async function Home() {
  const rooms = await getRooms();
  
  // Pre-fetch messages for each room
  const roomsWithMessages = await Promise.all(
    rooms.map(async (room) => ({
      ...room,
      messages: await getMessages(room.id)
    }))
  );

  return (
    <>
      <header className="bg-primary/10 py-4 mb-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            Teahouse Terminal
          </h1>
          <ThemeToggle />
        </div>
      </header>
      
      <main className="container mx-auto p-4">
        <RoomGrid initialRooms={roomsWithMessages} />
      </main>
    </>
  );
}
