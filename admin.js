module.exports = function(RED) {
    const QRCode = require('qrcode');
     
    function WhatsappAdmin(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        var whatsappLinkNode = RED.nodes.getNode(config.whatsappLink);
        node.client = whatsappLinkNode.client;
        RED.comms.publish("whatsappLinkNodeID", node.id)
            
        function SetStatus(WAStatus, color){
            node.status({fill:color,shape:"dot",text:WAStatus});
            msg = {payload : WAStatus};
            node.send(msg);    
        };
            
        
            // Commands recived for Whatsapp Admin.
            this.on('input', async function(msg, send){
                if (msg.payload === "destroy") {
                    if(node.client.clientType === "waWebClient"){
                        node.clinet.WAClose();
                        SetStatus("Disconnected","red");
                    }
                } 
                else if (msg.payload==="logout") {
                    if(node.client.clientType === "waWebClient"){
                        node.client.logout();
                        SetStatus("Logged Out","red");
                    }
                }
                else if (msg.payload === "test"){
                    if(node.client.clientType === "waWebClient"){
                        msg.payload = await node.client.getState();
                        node.send(msg);
                    }
                }           
                else if (msg.payload === "restart"){
                    if(node.client.clientType === "waWebClient"){
                        node.client.WARestart();
                        SetStatus("Connecting...", "yellow");
                    }
                };        
            });


        if(node.client.clientType === "waWebClient"){
            //Group Add/leave status-----
            node.client.on('group_join', async (notification)=>{
                msg.chat = await notification.getChat();
                msg.payload = msg.chat.name;
                msg.chatID = msg.chat.id.user || `No ID Avilable`;
                msg.type = notification.type;
                msg.notification = notification;
                node.send(msg);
                notification.reply('!Node-Red joined');
            });

            node.client.on('group_leave', async (notification)=>{
                msg.chat = await notification.getChat();
                msg.payload = msg.chat.name;
                msg.type = notification.type;
                msg.notification = notification;
                node.send(msg);
            });

            node.client.on('group_update', (msg)=>{
                node.send(msg);
            });

            
            //whatsapp Status Parameters----
            SetStatus("Connecting whatsapp...", "yellow");

            node.client.on('qr', (qr) => {
                SetStatus("Scan QR code to connect.", "yellow");
                QRCode.toDataURL(qr, function(err, url){
                    msg = {payload : url};
                    node.send(msg);
                    let qrImageWithID = {};
                    qrImageWithID.id = node.id;
                    qrImageWithID.image = url;
                    RED.comms.publish("whatsappLinkQrCode", qrImageWithID);
                });
            });
            
            node.client.on('auth_failure', () => {
                SetStatus('Connection Fail.','red');
            });
                    
            node.client.on('loading_screen', () => {
                SetStatus('Connecting...','yellow');
                let qrImageWithID = {};
                qrImageWithID.id = node.id;
                qrImageWithID.image = null;
                RED.comms.publish("whatsappLinkQrCode", qrImageWithID);
            });
            
            node.client.on('ready', () => {
                SetStatus('Connected','green');
            });

            node.client.on('disconnected', () => {
                SetStatus("Disconnected","red");
            });
        };

        if(node.client.clientType === "waSocketClient"){
            var client = null
            async function clientFromWhatsappLite(){
                client = await node.client;
                client.ev.on('connection.update', (updates)=>{
                    var {connection} = updates
                    //Setting conncetion status indication
                    if(connection === 'open'){
                        SetStatus("Connected", "green");
                    }
                    else if(updates.isOnline){
                        SetStatus("Connected", "green");
                    }
                    else if(connection === 'close'){
                        SetStatus("Disconnected", "red");
                    }
                    else if(connection === 'connecting'){
                        SetStatus("Connecting...", "yellow");
                    }
                    else if(updates.is){
                        SetStatus("Scan QR Code to Connect.", "yellow");
                    }
                })
            
            }
            clientFromWhatsappLite();

        };

        this.on(`close`, ()=>{
            SetStatus("Disconnected", "red");
        });
    }
    RED.nodes.registerType("admin", WhatsappAdmin);
}
