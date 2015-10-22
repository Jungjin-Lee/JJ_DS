
var Logging = true;
var Connected = 2;
var Connected_Send = '{"type":2}';

var Login = 5;
var LoginSuccess = 6;
// "type":"6" 이런식으로 문자열로 해버릴 경우 유니티에서 문제가 생긴다. type이 단일로 있을 경우에는 문제가 없었는데, 둘 이상이 되니까 문제가 생긴다.
// 이유는 잘 모르겠다....
var LoginSuccess_Send = '{"type":6, "name":"empty"}';
var LoginSuccess_Obj = JSON.parse(LoginSuccess_Send);

var SendChat = 10;
var ReceivedChat = 11;

var RoomJoin = 20;
var RoomJoinSuccess = 21;
var RoomJoinSuccess_Send = '{"type":21, "room":-1}';
var RoomJoinSuccess_Obj = JSON.parse(RoomJoinSuccess_Send);
var RoomJoinFailed = 22;

var RoomConnect = 30;
var RoomConnectSuccess = 31;
var RoomConnectSuccess_Send = '{"type":31, "room":-1, "slot":-1}';
var RoomConnectSuccess_Obj = JSON.parse(RoomConnectSuccess_Send);
var RoomConnectFailed = 32;
var RoomConnectFailed_Send = '{"type":32}';
var RoomConnectFailed_Obj = JSON.parse(RoomConnectFailed_Send);

var RoomInfo = 40;
var RoomInfo_Send = '{"type":40, "room":-1, "player1":"", "player2":""}';
var RoomInfo_Obj = JSON.parse(RoomInfo_Send);

//tcp서버를 요청할 함수
var tcp = require("net");
//포트번호와 아이피를 적어준다(우선 로컬 아이피로 함)
var port = 8000, address = "127.0.0.1";
//각 속켓들을 담을 배열을 할당
var sockets = new Array();
var players = new Array();
var rooms = new Array();
//서버 생성
var server = tcp.createServer( function(socket)
{
        // nagle off
        socket.setNoDelay(true);
        //입장한 사람의 아이피와 포트를 기록한다.
        console.log("connect : " + socket.remoteAddress + ":" + socket.remotePort + " 입장");
        // 성공적으로 연결 됐다고 알려준다.
        socket.write(Connected_Send);

        //socket.write("Welcome TCPServer");
        // 입장한 사람을 소켓 배열에 저장한다.
        sockets.push(socket);
        // 퇴장할경우
        socket.on("close",function()
        {
                //플레이어들을 검색 퇴장한 플레이어를 찾는다.
                var len = players.length;
                for(var i = 0; i < len; i++)
                {
                        var player = players[i];
                        if(player.remoteAddress == socket.remoteAddress && player.remotePort == socket.remotePort)
                        {
                                console.log(player.id + ":" + player.name + ":" + player.remoteAddress + ":" + player.remotePort + ":" + player.roomNumber + ":" + player.isRoom + ":" + player.slot);
                                // console.log(player);
                                if(player.isRoom) {
                                    if(player.slot == 1) {
                                        player.room.player1 = null;
                                    } else {
                                        player.room.player2 = null;
                                    }

                                    if(player.room.playerCnt == 1) {
                                        player.room.isEmpty = true;
                                    } else {

                                    }

                                    player.slot = 0;
                                    player.isRoom = false;
                                }
                                //퇴장한 사람의 소켓을 소켓 배열에서 삭제한다.
                                players.splice(i,1);
                                break;
                        }
                }

                //소켓들을 검색 퇴장한 소켓을 찾는다.
                len = sockets.length;
                for(var i = 0; i < len; i++)
                {
                        if(socket == sockets[i])
                        {
                                //이미 퇴장한 사람이라 아이피를 찾아오지 못한다.
                                console.log(socket.remoteAddress + ":" + socket.remotePort + " 퇴장");
                                //퇴장한 사람의 소켓을 소켓 배열에서 삭제한다.
                                sockets.splice(i,1);
                                break;
                        }
                }
        });
        

        //데이터가 넘어올 경우
        socket.on("data",function(data)
        {
                console.log("recv : " + data.toString());

                var jsonObj = JSON.parse(data);
                var jsonString = "";
                if(jsonObj.type == Login) {
                        var player = {};
                        player.socket = socket;
                        player.remoteAddress = socket.remoteAddress;
                        player.remotePort = socket.remotePort;
                        player.id = jsonObj.id;
                        player.name = jsonObj.id;
                        players.push(player);
                        LoginSuccess_Obj.name = jsonObj.id;
                        jsonString = JSON.stringify(LoginSuccess_Obj);
                        socket.write(jsonString);
                        //데이터를 스트링으로 변환해서 출력
                        console.log("send : " + jsonString);
                } else if(jsonObj.type == SendChat) {
                    jsonObj.type = ReceivedChat;
                    jsonString = JSON.stringify(jsonObj);
                    AllSendData(jsonString);
                } else if(jsonObj.type == RoomJoin) {
                    var player = GetPlayerAtSock(socket);
                    var room = PlayerRoomJoin(player);

                    RoomJoinSuccess_Obj.room = room.roomNumber;
                    jsonString = JSON.stringify(RoomJoinSuccess_Obj);
                    console.log("room join success : " + jsonString);
                    socket.write(jsonString);
                } else if(jsonObj.type == RoomConnect) {
                    var player = GetPlayerAtSock(socket);
                    var room = PlayerRoomConnect(player);

                    if(room == null) {
                        room = PlayerRoomJoin(player);

                        RoomJoinSuccess_Obj.room = room.roomNumber;
                        jsonString = JSON.stringify(RoomJoinSuccess_Obj);
                        console.log("room join success : " + jsonString);
                        socket.write(jsonString);

                        // console.log("room connect failed : ");
                        // socket.write(RoomConnectFailed_Send);
                    } else {
                        RoomConnectSuccess_Obj.room = room.roomNumber;
                        RoomConnectSuccess_Obj.slot = GetMySlotAtRoom(room, player);
                        jsonString = JSON.stringify(RoomConnectSuccess_Obj);
                        console.log("room connect success : " + jsonString);
                        socket.write(jsonString);

                        var RoomInfo_Send = '{"type":40, "room":-1, "player1":"", "player2":""}';
                        RoomInfo_Obj.room = room.roomNumber;
                        RoomInfo_Obj.player1 = room.player1.name;
                        RoomInfo_Obj.player2 = room.player2.name;
                        jsonString = JSON.stringify(RoomInfo_Obj);
                        console.log("room info send : " + jsonString);
                        AllSendDataInRoom(room, jsonString);
                    }
                }
                /*
                //소켓들을 검색 데이터를 보낸 소켓을 찾는다.
                var len = sockets.length;
                for(var i = 0; i < len; i++)
                {
                        //들어온 데이터를 모든 소켓들에게 보네줌
                        sockets[i].write(data);

                }
                //데이터를 스트링으로 변환해서 출력
                console.log("send : " + data.toString());*/
        });
});

function AllSendData(data) {
    //소켓들을 검색 데이터를 보낸 소켓을 찾는다.
    var len = sockets.length;
    for(var i = 0; i < len; i++)
    {
            //들어온 데이터를 모든 소켓들에게 보네줌
            sockets[i].write(data);

    }
}

function AllSendDataInRoom(room, data) {
    for(var i = 1; i <= 2; i++) {
        if(room['player' + i]) {
            room['player' + i].socket.write(data);
        }
    }
}

function GetPlayerAtSock(sock) {
    var len = players.length;
    for(var i = 0; i < len; i++)
    {
            var player = players[i];
            if(player.remoteAddress == sock.remoteAddress && player.remotePort == sock.remotePort)
            {
                    return player;
            }
    }
}

function PlayerRoomConnect(player) {
    var len = rooms.length;
    for(var i = 0; i < len; i++) {
        var room = rooms[i];
        if(!room.isEmpty && room.player2 == null) {
            room.player2 = player;
            room.playerCnt = 2;
            player.room = room;
            player.roomNumber = i;
            player.isRoom = true;
            player.slot = 2;
            if(Logging) console.log("roomconnect success : ");
            return room;
        }
    }
    if(Logging) console.log("roomconnect not empty : ");
    return null;
}

function PlayerRoomJoin(player) {
    var exist = false;
    var len = rooms.length;
    for(var i = 0; i < len; i++) {
        var room = rooms[i];
        if(room.isEmpty) {
            room.roomNumber = i;
            room.isEmpty = false;
            room.player1 = player;
            room.player2 = null;
            room.playerCnt = 1;

            player.room = room;
            player.roomNumber = i;
            player.isRoom = true;
            player.slot = 1;
            if(Logging) console.log("roomjoin recycle : " + room.roomNumber);
            return room;
        }
    }
    var newRoom = {};
    newRoom.isEmpty = false;
    newRoom.player1 = player;
    newRoom.player2 = null;
    newRoom.playerCnt = 1;

    rooms.push(newRoom);
    newRoom.roomNumber = rooms.length - 1;
    player.room = newRoom;
    player.roomNumber = rooms.length - 1;
    player.isRoom = true;
    player.slot = 1;
    if(Logging) console.log("roomjoin make : ");
    return newRoom;
}

function GetMySlotAtRoom(room, player) {
    if(room.player1 && room.player1 == player) {
        return 1;
    } else if(room.player2 && room.player2 == player) {
        return 2;
    }
}

//tcp서버가 listening을 시작함을 알림
server.on("listening", function()
{
        console.log("Server is listening on port", port);
});

//tcp서버가 listen을 시작
server.listen(port,address);

//서버 시작을 알림
console.log("StartServer " + address + ":" + port);