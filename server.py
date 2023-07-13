#! /usr/bin/python

import asyncio
from websockets.server import serve

PLAYERS = {
    1: {
        'name': 'Player 1',
        'side': None,
        'position': None,
    },
    2: {
        'name': 'Player 2',
        'side': None,
        'position': None,
    },
}

def handle(message):
    # match the message type
    print(message)
    if message.type == 'tronsetup':
        # find the first empty slot
        for i in [1, 2]:
            if PLAYERS[i]['side'] == None:
                PLAYERS[i]['side'] = message.side
                print("Player %d joined" % i)
                break
        else:
            print("No more room for players")

async def wss_handler(websocket):
    async for message in websocket:
        handle(message)

        if all(player['side'] != None for player in PLAYERS.values()):
            await websocket.send({
                'type': 'tronstart',
                'side': min(player['side'] for player in PLAYERS.values())
            })

async def wss_runner():
    async with serve(wss_handler, "localhost", 11235):
        print("WSS Server Started [ws://localhost:11235]")
        await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(wss_runner())
