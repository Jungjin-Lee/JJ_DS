var RoomManager = require('RoomManager');
var player = {};

console.log("testServer");
console.log("roomManager:" + RoomManager);
// console.log("bar:" + RoomManager.bar);
RoomManager.bar();
console.log("rooms:" + RoomManager.rooms);
console.log("rooms:" + RoomManager.room);
console.log("getRoomCnt:" + RoomManager.getRoomCnt());

RoomManager.join(player);
player = {};
RoomManager.connect(player);
// RoomManager.make();
// console.log("bar():" + RoomManager.bar());
// console.log("clear:" + RoomManager.clear);
// console.log(RoomManager.clear());
// console.log("rooms:" + RoomManager.rooms);