
$(document).ready(function(){
    for(var j = 0; j < (tiles - 1); j++){
        for(var i = 0; i< (tiles); i++){    
            $("#dvMain").append("<div></div>");  
        }
        $("#dvMain").append("<br>")
    }
})
$(document).ready(function(){
    for(var i = 0; i < tiles; i++){
        $("#dvMain").append("<div class='taken'></div>"); 
    }
});

document.addEventListener('DOMContentLoaded', () => {
    
    const squares = document.querySelectorAll('.grid div')
    const result = document.querySelector('#result')
    const displayCurrentPlayer = document.querySelector('#current-player')    
    
    let currentPlayer = 1
    const initialArray = []

    
    for(let i = 0; i < (tiles * tiles); i++){
        initialArray.push(0)
    }
    console.log(tiles)
    console.log(initialArray)

    const line = tiles
    const column = tiles
    let countWinner = 0
    
    function checkForWinner(){
        
        for(let j = 0; j < column; j++){
            for (let i = 0; i < line; i++){
                const d = (j * column) + i
                if (initialArray[d] === currentPlayer) {
                    countWinner++
                    if (countWinner >= 4) {
                        // console.log(d)
                        result.innerHTML = 'Player ' + currentPlayer + ' Wins'
                    }
                } else {
                    countWinner = 0
                    } 
            }
    
            for (let i = 0; i < line; i++){
                const d = (i * column) + j
                if (initialArray[d] === currentPlayer) {
                    countWinner++
                    if (countWinner >= 4) {
                        // console.log(d)
                        result.innerHTML = 'Player ' + currentPlayer + ' Wins'
                }
            } else {
                countWinner = 0
                } 
            }
            countWinner = 0
        }
    }

    for(let i = 0; i < squares.length; i++){
        squares[i].onclick = () =>{
            console.log(i)
            if (squares[i].classList.contains('taken')){
                if(currentPlayer == 1){
                    if (i>=tiles) squares[i - tiles].classList.add('taken')
                    squares[i].classList.add('player-one')
                    initialArray[i] = currentPlayer
                    checkForWinner();
                    currentPlayer = 2
                    displayCurrentPlayer.innerHTML = currentPlayer
                    
                } else if(currentPlayer == 2){
                    if (i>=tiles) squares[i - tiles].classList.add('taken')
                    squares[i].classList.add('player-two')
                    initialArray[i] = currentPlayer
                    checkForWinner()
                    currentPlayer = 1
                    displayCurrentPlayer.innerHTML = currentPlayer   
                }
            } else alert('Cant mark here')

            // console.log(initialArray)
            // console.log(b)

        }
    }

})





