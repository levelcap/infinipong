# infinipong
## Infinite Pong using Node / Express / Socket.IO / MongoDB

Text-based (for now!) Pong that allows games to interact with each other.
When players join the game, they will either be added to an existing game that is missing a player,
or a new game will be created to the left or right (alternating) of the latest game.
When a ball scores, it will either be added to the next Pong game on that side, or if no game exists the team score for that side will increment.

### Socket.IO
We use Socket.IO to communicate paddle moves from the players to the server, and communicate game state calculated on the server back to the players

### MongoDB
MongoDB stores Pong game states as well as Events as the games play storing player moves,
game states per tick to allow replaying finished games and future analytics.
