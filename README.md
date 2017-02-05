# infinipong
## Infinite Pong using Node / Express / Socket.IO / MongoDB

Text-based (for now!) Pong that allows games to interact with each other.  When players join the game, they will either be added to an existing game that is missing a player, or a new game will be created to the left or right (alternating) of the latest game.  When a ball scores, it will either be added to the next Pong game on that side, or if no game exists the team score for that side will increment.
