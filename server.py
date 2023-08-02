#! /usr/bin/python

import asyncio, json
from websockets import exceptions
from websockets.server import serve


PLAYERS = {}


def origin(websocket):
    return websocket.remote_address[0]


class Info:

    def Connected(websocket):
        return origin(websocket) in PLAYERS


    def Connect(websocket, player):
        PLAYERS[origin(websocket)] = Info(player, websocket)


    def Player(websocket):
        if not Info.Connected(websocket):
            return 0

        return PLAYERS[origin(websocket)].player


    def SaveCoords(websocket, width, height):
        PLAYERS[origin(websocket)].width = width
        PLAYERS[origin(websocket)].height = height


    def SaveHit(websocket, p, x, y):
        PLAYERS[origin(websocket)].hit = (p, x, y)


    def OtherPlayer(websocket):
        for ip, info in PLAYERS.items():
            if origin(websocket) != ip:
                return info.websocket

    def __init__(self, player, websocket):
        self.player = player
        self.websocket = websocket
        self.connected = False
        self.width = None
        self.height = None
        self.hit = None


class Message:
    def __init__(self, message):

        message = json.loads(message)

        self.type = message['type']

        match self.type:
            case 'connect':
                pass

            case 'start':
                self.width = message['width']
                self.height = message['height']

            case 'turn':
                self.direction = message['direction']
                self.x = message['x']
                self.y = message['y']

            case 'speed':
                self.spedup = message['spedup']
                self.x = message['x']
                self.y = message['y']

            case 'hit':
                self.player = message['player']
                self.x = message['x']
                self.y = message['y']


    def __str__(self):
        return json.dumps(self.__dict__)


def comp(n):
    return 1 if n == 2 else 2


def assign_player(websocket):
    if len(PLAYERS) < 2:
        player = 1 if len(PLAYERS) == 0 else comp(list(PLAYERS.values())[0].player)
        Info.Connect(websocket, player)
        return player
    return 0


def reset_player(websocket):
    if Info.Connected(websocket):
        Info.Connect(websocket, Info.Player(websocket))


def save_coords(websocket, width, height):
    if Info.Connected(websocket):
        Info.SaveCoords(websocket, width, height)


def handshake_coords():
    if len(PLAYERS) == 2 and all(info.width for info in PLAYERS.values()):
        return (
            min(info.width  for info in PLAYERS.values()),
            min(info.height for info in PLAYERS.values()),
        )

    return None


async def send_all(message):
    for info in PLAYERS.values():
        await info.websocket.send(message)


def handshake_hit():
    if all(info.hit for info in PLAYERS.values()):
        [hit1, hit2] = [info.hit for info in PLAYERS.values()]
        return hit1[0] if hit1 == hit2 else 0
    return 0


async def handle(websocket, M: Message):
    match M.type:

        case 'connect':
            if origin(websocket) in PLAYERS:
                player = Info.Player(websocket)
                print(f"Player {player} reconnected")
                reset_player(websocket)
                await websocket.send(json.dumps({ 'type': 'connect', 'player': player }))
                return

            # impure function, do not call more than once
            player = assign_player(websocket)
            print(f"Player {player} connected")
            await websocket.send(json.dumps({ 'type': 'connect', 'player': player }))

        case 'start':
            print(f"Player {Info.Player(websocket)} started")
            save_coords(websocket, M.width, M.height)
            if h := handshake_coords():
                await send_all(json.dumps({ 'type': 'start', 'width': h[0], 'height': h[1] }))

        case 'turn':
            print(f"Player {Info.Player(websocket)} turned {M.direction} at {M.x}, {M.y}")
            if len(PLAYERS) < 2:
                return

            ws = Info.OtherPlayer(websocket)
            await ws.send(str(M))

        case 'speed':
            print(f"Player {Info.Player(websocket)} sped {'up' if M.spedup else 'down'}")
            if len(PLAYERS) < 2:
                return

            ws = Info.OtherPlayer(websocket)
            await ws.send(str(M))

        case 'hit':
            print(f"Player {Info.Player(websocket)} detected a player {M.player} hit at {M.x}, {M.y}")
            if len(PLAYERS) < 2:
                return

            Info.SaveHit(websocket, M.player, M.x, M.y)
            if hit := handshake_hit():
                print(f"Player {2 - hit + 1} won")
                await send_all(json.dumps({ 'type': 'won', 'player': 2 - hit + 1 }))


async def wss_handler(websocket):
    try:
        async for message in websocket:
            await handle(websocket, Message(message))

    except exceptions.ConnectionClosed as e:
        print(e)
        print(f"Player {Info.Player(websocket)} disconnected")
        del PLAYERS[origin(websocket)]


async def wss_runner():
    async with serve(wss_handler, "0.0.0.0", 11235):
        print("WSS Server Started [ws://0.0.0.0:11235]")
        await asyncio.Future()


if __name__ == '__main__':
    asyncio.run(wss_runner())
