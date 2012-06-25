
    function getRandomRoomName() {
        return Math.floor(Math.random() * 1000000).toString(36).toUpperCase();
    }

    for (var i = 0; i < 10; i++) {
        console.log(getRandomRoomName());
    };

    
