
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
var RoomJoinSuccess_Send = '{"type":21, "room":0}';
var RoomJoinSuccess_Obj = JSON.parse(RoomJoinSuccess_Send);
var RoomJoinFailed = 22;

var RoomConnect = 30;
var RoomConnectSuccess = 31;
var RoomConnectSuccess_Send = '{"type":31, "room":0, "player1":""}';
var RoomConnectSuccess_Obj = JSON.parse(RoomConnectSuccess_Send);
var RoomConnectFailed = 32;
var RoomConnectFailed_Send = '{"type":32}';
var RoomConnectFailed_Obj = JSON.parse(RoomConnectFailed_Send);

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
                //소켓들을 검색 퇴장한 소켓을 찾는다.
                var len = players.length;
                for(var i = 0; i < len; i++)
                {
                        var player = players[i];
                        if(player.remoteAddress == socket.remoteAddress && player.remotePort == player.remotePort)
                        {
                                //이미 퇴장한 사람이라 아이피를 찾아오지 못한다.
                                console.log(player.id + ":" + player.id + " 유저 퇴장");
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
                    var player = GetPlayerAtSock(sock);
                    var room = RoomJoin(player);

                    RoomJoinSuccess_Obj.room = room.roomNumber;
                    jsonString = JSON.stringify(RoomJoinSuccess_Obj);
                    console.log("room join success : " + jsonString);
                    socket.write(jsonString);
                } else if(jsonObj.type == RoomConnect) {
                    var player = GetPlayerAtSock(sock);
                    var room = RoomConnect(player);

                    if(room == null) {
                        console.log("room connect failed : ");
                        socket.write(RoomConnectFailed_Send);
                    } else {
                        RoomConnectSuccess_Obj.room = room.roomNumber;
                        RoomConnectSuccess_Obj.player1 = room.player1.name;
                        jsonString = JSON.stringify(RoomConnectSuccess_Obj);
                        console.log("room connect success : " + jsonString);
                        socket.write(jsonString);
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

function GetPlayerAtSock(sock) {
    var len = players.length;
    for(var i = 0; i < len; i++)
    {
            var player = players[i];
            if(player.remoteAddress == socket.remoteAddress && player.remotePort == player.remotePort)
            {
                    return player;
            }
    }
}

function RoomConnect(player) {
    var len = rooms.length;
    for(var i = 0; i < len; i++) {
        var room = rooms[i];
        if(!room.isEmpty && room.player2 == null) {
            room.player2 = player;
            player.roomNumber = i;
            player.roomIndex = 1;
            return room;
        }
    }
    return null;
}

function RoomJoin(player) {
    var exist = false;
    var len = rooms.length;
    for(var i = 0; i < len; i++) {
        var room = rooms[i];
        if(room.isEmpty) {
            room.roomNumber = i;
            room.isEmpty = false;
            room.player1 = player;
            room.player2 = null;
            player.roomNumber = i;
            player.roomIndex = 0;
            return room;
        }
    }
    var newRoom = {};
    newRoom.isEmpty = false;
    newRoom.player1 = player;
    newRoom.player2 = null;

    rooms.push(newRoom);
    newRoom.roomNumber = room.length - 1;
    player.roomNumber = room.length - 1;
    player.roomIndex = 0;
    return room;
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