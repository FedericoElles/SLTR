

var app = angular.module('app',['MyTimeAgoModule']).
  config(function($routeProvider) {
    $routeProvider.
      when('/', {controller:MainCtrl, templateUrl:'main.html'}).
      when('/play', {controller:PlayCtrl, templateUrl:'play.html'}).
      otherwise({redirectTo:'/'});
  });
 
app.config(function($compileProvider){
  $compileProvider.urlSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|tel):/);
});



/**
 * Initialize global player object
 */
app.run(function($rootScope, $http, $location) {
  $rootScope.test = 'Hallo World'

  $rootScope.player = {
    "id":'' + (new Date()).getTime(),
    "stats":{
      "games":0,
      "win":0,
      "bestTime":0,
      "bestMoves":0
    },
    "games": []
  }

  $rootScope.saveGame = function(obj){
    $rootScope.player.games.push(obj)
    $rootScope.player.stats.games +=1
    $rootScope.save()    
  }

  $rootScope.updateGame = function(obj){
    console.log('updateGame',obj)
    var player = $rootScope.player
    player.games[player.games.length-1] = obj
    if (obj.won) player.stats.win +=1  
    if (obj.seconds < player.stats.bestTime || player.stats.bestTime == 0) player.stats.bestTime = obj.seconds
    if (obj.moves < player.stats.bestMoves || player.stats.bestMoves == 0) player.stats.bestMoves= obj.moves
    $rootScope.save()    
  }

  //save player
  $rootScope.save = function(){
    localStorage.setItem('player',JSON.stringify($rootScope.player))
  }

  //init player
  var player = localStorage.getItem('player')
  if (player) {
    $rootScope.player = JSON.parse(player) 
    //console.log($rootScope.player)
  } else {
    $rootScope.save()
  }


})


/**
 * 
 */
function MainCtrl($scope, $location, $routeParams) {
  $scope.ctrl = {}

}

/**
 * 
 */
function PlayCtrl($scope, $location, $routeParams, $rootScope) {

  $scope.ctrl = {}
  $scope.ctrl.stockVisibleCard = false //at beginning, no card  visible
  $scope.ctrl.selectedArray = false
  $scope.ctrl.symbols = ['� ','♥','♣','♦']
  $scope.ctrl.values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']
  
  $scope.stock = []
  $scope.tableau = []
  $scope.tableauStock = []
  $scope.foundation = []
  $scope.game = {}
  
  
  //initialize all scope values newly
  var initScope = function(){
    $scope.stock={'type':'stock','cards':[]}
    $scope.tableau = [[],[],[],[],[],[],[]]
    $scope.tableauStock=[[],[],[],[],[],[],[]]
    for (var i=0,ii=7;i<ii;i+=1){
      $scope.tableau[i] ={'type':'tableau','id':i,'cards':[]}
      $scope.tableauStock[i] ={'type':'tableauStock','id':i,'cards':[]}
    }
    $scope.foundation=[[],[],[],[]]
    for (var i=0,ii=4;i<ii;i+=1){
      $scope.foundation[i] ={'type':'foundation','symbol':i,'cards':[]}
    }
    //game object
    $scope.game = {}
    $scope.game.moves = 0
    $scope.game.startTime = new Date()
    $scope.game.won = false
    $scope.game.tableau = false
    $scope.game.tableauStock = false
    $scope.game.stock = false
  }

  $scope.getCards = function(){
    var cards = []
    for (var i = 0,ii=4;i<ii;i+=1){ //symbol
      for (var j = 0,jj=13;j<jj;j+=1){ //value
        cards.push({'symbol':i,'value':j})      
      }
    }
   //console.log('getCards',cards)
   return cards
  }

  $scope.mixArray = function(a){
    a.sort(function(a, b) {
      return Math.random() - 0.5;
    })
    return a
  }

  $scope.dealCards = function(a){
    $scope.ctrl.stockVisibleCard = false 
    $scope.ctrl.selectedArray = false
    initScope()

    //add cards to all available decks
    $scope.stock.cards=[]
    for (var i=0,ii=7;i<ii;i+=1){
      $scope.tableau[i].cards = [a.shift()]
      $scope.tableauStock[i].cards = []
      for (j=0,jj=i;j<jj;j+=1){ 
        $scope.tableauStock[i].cards.push(a.shift())
      }
    }
    //TODO: Save card deck in $scope.game
    $scope.stock.cards=a
  }


  $scope.demo = function(){
    var a = $scope.getCards()
    a = $scope.mixArray(a)
    a = $scope.mixArray(a)
    a = $scope.mixArray(a)
    //console.log('demo',a)
    $scope.dealCards(a)
    $scope.game.tableau = angular.copy($scope.tableau) 
    $scope.game.tableauStock = angular.copy($scope.tableauStock)
    $scope.game.stock = angular.copy($scope.stock)
    $scope.saveGame($scope.game)
    $scope.autoPlay()
  }

  


  /**
   * GAME LOGIC FUNCTIONS
   */

  /**
   * Reveals next card from stock and activates it
   */
  $scope.newStockCard = function(){
    $scope.ctrl.stockVisibleCard = true //make stock visible

    //shift first card to back
    if ($scope.stock.cards.length > 0){
      var card = $scope.stock.cards.shift()
      $scope.stock.cards.push(card)
      $scope.game.moves +=1 
      $scope.autoPlay()
    }
  }

  //Handles any click on a deck
  $scope.selectDeck = function(obj,name){
    if(angular.equals(obj, $scope.ctrl.selectedArray)){
      $scope.ctrl.selectedArray = false
      $scope.ctrl.highlighted = ''        
    } else {
      if ($scope.ctrl.selectedArray == false && obj.cards.length==0){}else{ 
        $scope.ctrl.selectedArray=obj
        $scope.ctrl.highlighted=name
      }
    }
  }


  /**
   * Knows two 
   */

  $scope.$watch('ctrl.selectedArray',function(newVal,oldVal){
    //console.log('ctrl.selectedArray',newVal,oldVal)
    var moveAllowed = false 
    var moveCardsAmount = 1
    var disableSelect = false
    var doAutoPlay = true
    if (newVal && oldVal){
      var newTopCard = newVal.cards.slice(-1)[0]
      var oldTopCard = oldVal.cards.slice(-1)[0]
      
      //oldVal must have at least one card
      if (oldVal.cards.length == 0) moveAllowed = false

      // RULES:
      // Foundation only accepts same symbol
      if (newVal.type == 'foundation'){
        if (newTopCard){
          //target is not empty and source is one higher than target
          if (newTopCard.symbol == oldTopCard.symbol && oldTopCard.value-1 == newTopCard.value) {
            moveAllowed = true
          }          
        } else {
          //target is empty and source is 0
          if (oldTopCard.symbol == newVal.symbol && oldTopCard.value==0){
            moveAllowed = true
          }          
        }
      } 

      //Tableau only accepts 12 {K} if empty and no tableauStock is available
      if (newVal.type == 'tableau'){
        if (newVal.cards.length==0 && $scope.tableauStock[newVal.id].cards.length == 0 && 
            oldTopCard.value==12){
          moveAllowed = true
        }          
      }

      //disable autoPlay if moving from foundation to tableau
      if (oldVal.type == "foundation" && newVal.type == 'tableau'){
        doAutoPlay = false
      }

      //Any 2 Tableau card movement
      if (newVal.type == 'tableau'){
        if (newTopCard && oldTopCard ){
          if (newTopCard.value == oldTopCard.value+1 && newTopCard.symbol%2 !=  oldTopCard.symbol%2){
            moveAllowed = true
          } 
          //Tableau 2 Tableau multi card movement
          if (oldVal.type == 'tableau' && !moveAllowed){
            //search for valid card
            // a b c d           
            for(var i=0,ii=oldVal.cards.length;i<ii;i+=1){
              var currentCard = oldVal.cards[i]
              if (newTopCard.value == currentCard.value+1 && newTopCard.symbol%2 !=  currentCard.symbol%2){
                moveAllowed = true
                moveCardsAmount = oldVal.cards.length-i
                //console.log('move.multiCard',moveCardsAmount)
              }
            }
          }       
        }
        //Tableau King to Empty Tableau movement
        if (newVal.cards.length==0 && oldVal.cards.length>0 && oldVal.type == 'tableau'){
          //bottom card must be king
          if (oldVal.cards[0].value==12){
            moveAllowed = true
            moveCardsAmount = oldVal.cards.length
          }
        } 
      }



      if (moveAllowed){
        //use moveCardsAmount to move more cards at once, but in same direction
        // a b c d |  1 2 3 -> 2 -> a b | 1 2 3 c d  
        newVal.cards = newVal.cards.concat(oldVal.cards.splice(-1*moveCardsAmount))
        $scope.game.moves +=1
        disableSelect = true  
        fillTableau() 
        //console.log('card moved from ' + oldVal.type + '('+oldVal.cards.length+') to ' +
        //          newVal.type + '('+newVal.cards.length+')')
        if (doAutoPlay ) $scope.autoPlay()
      }

      if (disableSelect){
        $scope.ctrl.selectedArray = false
        $scope.ctrl.highlighted = ''        
      }

    }
  })

  /**
   * If tableau empty and tableauStock filled, move cards
   */
  var fillTableau = function(){
    //console.log('fillTableau ',$scope.tableau)
    for (var i=0,ii=$scope.tableau.length;i<ii;i+=1){
      if ($scope.tableau[i].cards.length==0 && $scope.tableauStock[i].cards.length>0){
        $scope.tableau[i].cards.push($scope.tableauStock[i].cards.pop())
      }
    }
  }

  /**
   * AutoPlay - fills foundation automagically from tableau and stock
   */
  var autoPlay = function(){
    var moved = false
    //check all sources
    var sources = [$scope.stock]
    for (var i=0,ii=$scope.tableau.length;i<ii;i+=1){
      sources.push($scope.tableau[i])
    }
    for (var i=0,ii=sources.length;i<ii;i+=1){
      if (sources[i].cards.length>0){
        var source = sources[i] 
        topCard = source.cards[source.cards.length-1]
        //check targat
        for (var j=0;j<4;j+=1){
          target = $scope.foundation[j]
          //symbols must match
          if (target.symbol == topCard.symbol){
            targetTopCard = false
            if (target.cards.length>0){
              targetTopCard = target.cards[target.cards.length-1]
            }
            var moveAllowed = false 
            //ace on blank foundation 
            if (!targetTopCard && topCard.value==0){
              moveAllowed = true
            }

            //higher card on existing card
            if (targetTopCard){
              if (targetTopCard.value+1 == topCard.value)
              moveAllowed = true
            }

            //only if tableauStock is not empty
            var tableauStockEmpty= true
            for (var k=0,kk=$scope.tableauStock.length;k<kk;k+=1){
              if($scope.tableauStock[k].cards.length>0) tableauStockEmpty = false 
            }

            if (!tableauStockEmpty && moveAllowed && topCard.value>1){
              //if move is possible to a deck in the tableau, stop auto
              //loop through tableau and check of compatibility
              for (var k=0,kk=$scope.tableau.length;k<kk;k+=1){
                possibleTarget = $scope.tableau[k]
                if (possibleTarget.cards.length>0){
                  possibleTargetTopCard = possibleTarget.cards[possibleTarget.cards.length-1]
                  //check if topCard can be put on possibleTargetTopCard
                  //if yes, moveAllowed = false
                  if (topCard.value+1 == possibleTargetTopCard.value && topCard.symbol%2 !=  possibleTargetTopCard.symbol%2){
                    moveAllowed = false
                    console.log('autoPlay:stopped, because two moves possible')
                  }
                }
              }
            } //tableauStock not empty

            //move cards
            if (moveAllowed){
              target.cards.push(source.cards.pop())
              //auto move do not count
              moved = true 
              if (source.type == 'tableau') fillTableau() 
              return true  
            }
          } //end same symbols
        } //end for
      }
    }
    return moved
  }


  /**
   *
   */
  $scope.autoPlay = function(){
    while (autoPlay()){}
    checkGame()
  }

  /**
   *
   */
  $scope.instantWin = function(){
    checkGame(true)
  }


  /**
   * Checks if game has be won
   * @param {force} set to true to directly win game
   */
  var checkGame = function(force){
    var won = true
    for (var j=0;j<4;j+=1){
      if ($scope.foundation[j].cards.length < 13) won = false
    }

    if (won || force){
      $scope.game.won = true
      $scope.game.endTime = new Date()
      $scope.game.seconds = getDiffSeconds($scope.game.startTime,$scope.game.endTime) 
      if (force) {
        $scope.game.seconds +=1000
        $scope.game.moves +=1000
      }
      $scope.updateGame($scope.game)
    }
  }


  /**
   * UI FUNCTIONS
   */
  $scope.uiGetCard = function(a){
    if (a.cards.length>0){
      var c = a.cards[a.cards.length-1]
      return  $scope.transValue(c.value) +'<br>'+ $scope.transSymbol(c.symbol)
    }
  }

  /**
   *
   */
  $scope.uiGetCardColor= function(a){
    if (!a.cards) a = {"cards":[a]}
    if (a.cards.length>0){
      var c = a.cards[a.cards.length-1]
      return  'card-' + ['black','red'][c.symbol%2]
    } else {
      return ''
    }
  }

  /**
   *
   */
  $scope.transSymbol=function(val){
    return $scope.ctrl.symbols[val]
  }

  /**
   *
   */  
  $scope.transValue=function(val){
    return $scope.ctrl.values[val]
  }

  // deal cards
  $scope.demo()

}


/**
 * HELP FUNCTION
 */

/**
 * Return seconds between two dates
 */
var getDiffSeconds = function(date1,date2){
  var timeDiff = Math.abs(date2.getTime() - date1.getTime());
  var diffSeconds = Math.ceil(timeDiff / 1000); 
  return diffSeconds
}