//tcp서버를 요청할 함수
var tcp = require("net");
//포트번호와 아이피를 적어준다(우선 로컬 아이피로 함)
var port = 8001, address = "127.0.0.1";
//각 속켓들을 담을 배열을 할당
var sockets = new Array();
var PlayerManager = require('PlayerManager');
var RoomManager = require('RoomManager');
var ProtocolManager = require('ProtocolManager');
ProtocolManager.Init();

//서버 생성
var server = tcp.createServer( function(socket)
{
        // nagle off
        socket.setNoDelay(true);
        //입장한 사람의 아이피와 포트를 기록한다.
        console.log("connect : " + socket.remoteAddress + ":" + socket.remotePort + " 입장");
        // 성공적으로 연결 됐다고 알려준다.
        socket.write(ProtocolManager.Connected_Send);

        //socket.write("Welcome TCPServer");
        // 입장한 사람을 소켓 배열에 저장한다.
        sockets.push(socket);
        // 퇴장할경우
        socket.on("close",function()
        {
                //플레이어들을 검색 퇴장한 플레이어를 찾는다.
                var player = PlayerManager.getPlayerAtSock(socket);
                if(player) {
                  if(player.isRoom) {
                    RoomManager.clear(player);
                  }
                    console.log(player.id + ":" + player.name + ":" + player.remoteAddress + ":" + player.remotePort + ":" + player.roomNumber + ":" + player.isRoom + ":" + player.slot);
                    PlayerManager.clear(player);
                    PlayerManager.remove(player.index);
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
                if(jsonObj.type == ProtocolManager.Login) {
                        // var player = {};
                        var player = PlayerManager.make();
                        console.log(player);
                        player.remoteAddress = socket.remoteAddress;
                        player.remotePort = socket.remotePort;
                        player.id = jsonObj.id;
                        player.name = jsonObj.id;
                        console.log(player);
                        player.socket = socket;

                        ProtocolManager.LoginSuccess_Obj.name = jsonObj.id;
                        jsonString = JSON.stringify(ProtocolManager.LoginSuccess_Obj);
                        socket.write(jsonString);
                        //데이터를 스트링으로 변환해서 출력
                        console.log("send : " + jsonString);
                } else if(jsonObj.type == ProtocolManager.SendChat) {
                    jsonObj.type = ProtocolManager.ReceivedChat;
                    jsonString = JSON.stringify(jsonObj);
                    AllSendData(jsonString);
                } else if(jsonObj.type == ProtocolManager.RoomJoin) {
                    var player = PlayerManager.getPlayerAtSock(socket);
                    var room = RoomManager.join(player);

                    ProtocolManager.RoomJoinSuccess_Obj.room = room.roomNumber;
                    jsonString = JSON.stringify(ProtocolManager.RoomJoinSuccess_Obj);
                    console.log("room join success : " + jsonString);
                    socket.write(jsonString);
                } else if(jsonObj.type == ProtocolManager.RoomConnect) {
                    var player = PlayerManager.getPlayerAtSock(socket);
                    var room = RoomManager.connect(player);

                    if(room == null) {
                        room = RoomManager.join(player);

                        ProtocolManager.RoomJoinSuccess_Obj.room = room.roomNumber;
                        jsonString = JSON.stringify(ProtocolManager.RoomJoinSuccess_Obj);
                        console.log("room join success : " + jsonString);
                        socket.write(jsonString);

                        // console.log("room connect failed : ");
                        // socket.write(RoomConnectFailed_Send);
                    } else {
                        ProtocolManager.RoomConnectSuccess_Obj.room = room.roomNumber;
                        ProtocolManager.RoomConnectSuccess_Obj.slot = RoomManager.getMySlotAtRoom(room, player);
                        jsonString = JSON.stringify(ProtocolManager.RoomConnectSuccess_Obj);
                        console.log("room connect success : " + jsonString);
                        socket.write(jsonString);

                        ProtocolManager.RoomInfo_Obj.room = room.roomNumber;
                        for(var i = 0; i < RoomManager.getUserMax(); i++) {
                          if(room.players[i]) {
                            ProtocolManager.RoomInfo_Obj["player" + i] = room.players[i].name;
                          }
                        }
                        jsonString = JSON.stringify(ProtocolManager.RoomInfo_Obj);
                        console.log("room info send : " + jsonString);
                        RoomManager.allSend(room, jsonString);
                        // RoomManager.allSend(room, ProtocolManager.RoomPlay_Send);
                        //
                        // ProtocolManager.RoomPlayDice_Obj.t = 1;
                        // jsonString = JSON.stringify(ProtocolManager.RoomPlayDice_Obj);
                        // RoomManager.allSend(room, jsonString);
                    }
                } else if(jsonObj.type == ProtocolManager.RoomPlay) {
                    var player = PlayerManager.getPlayerAtSock(socket);
                    var room = player.room;
                    RoomManager.start(room);
                    RoomManager.giveCard(room, ProtocolManager, 0);
                } else if(jsonObj.type == ProtocolManager.RoomRaceCall) {
                    var player = PlayerManager.getPlayerAtSock(socket);
                    var room = player.room;
                    RoomManager.raceNext(room, player, ProtocolManager, ProtocolManager.RoomRaceCall);
                } else if(jsonObj.type == ProtocolManager.RoomRaceHalf) {
                    var player = PlayerManager.getPlayerAtSock(socket);
                    var room = player.room;
                    RoomManager.race(room, player);
                    RoomManager.raceNext(room, player, ProtocolManager, ProtocolManager.RoomRaceHalf);
                }
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

//tcp서버가 listening을 시작함을 알림
server.on("listening", function()
{
        console.log("Server is listening on port", port);
});

//tcp서버가 listen을 시작
server.listen(port,address);

//서버 시작을 알림
console.log("StartServer " + address + ":" + port);
