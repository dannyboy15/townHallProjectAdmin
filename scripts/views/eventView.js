(function(module) {
  var firebasedb = firebase.database();
  var provider = new firebase.auth.GoogleAuthProvider();

  // object to hold the front end view functions
  var eventHandler = {};

  // creates new TownHall object from form
  eventHandler.save = function (e) {
    e.preventDefault();
    var newTownHall = new TownHall( $('#save-event input').get().reduce(function(newObj, cur){
      newObj[cur.id] = $(cur).val();
      return newObj;
    }, {})
  );
    newTownHall.getLatandLog(newTownHall.address);
  };


// Given a new event, creates TownHall Object and encodes with lat and lng based on address from google docs
  eventHandler.saveSimple = function (newevent) {
    var newTownHall = new TownHall(newevent);
    newTownHall.getLatandLog(newTownHall.streetNumber + newTownHall.streetName +newTownHall.Zip);
  };

  // given an event and a current key, update that event.
  eventHandler.update = function (newevent , key) {
    var newTownHall = new TownHall(newevent);
    var address = newTownHall.streetNumber +' '+ newTownHall.streetName +' '+ newTownHall.City + ' ' + newTownHall.Zip;
    console.log(address);
    newTownHall.getLatandLog(address, key);
  };

  // Renders the page in response to lookup
  eventHandler.lookup = function (e) {
    e.preventDefault();
    var zip = $('#look-up input').val();
    if (zip) {
      TownHall.lookupZip($('#look-up input').val());
    }

  };

  // reset the home page to originial view
  eventHandler.resetHome = function () {
    $('[data-toggle="popover"]').popover('hide');
    $('.header-small').hide();
    $('.header-large').fadeIn();
    $('#look-up input').val('');
    $('.form-text-results').removeClass('text-center');
    $('.left-panels').removeClass('left-panels-border');
    $('#nearest').removeClass('nearest-with-results');
    $('#button-to-form').hide();
    $('.spacer').show();
    $('#look-up').appendTo($('.right-panels'));
    $('#resetTable').hide();
    TownHall.isCurrentContext = false;
    TownHall.currentContext = [];
    TownHall.zipQuery = '';
    $('#map').appendTo('.map-large');
    onResizeMap();
    var $parent = $('#nearest');
    var $results = $('#textresults');
    $parent.empty();
    $results.empty();
    $table = $('#all-events-table');
    $table.empty();
    TownHall.allTownHalls.forEach(function(ele){
      eventHandler.renderTable(ele, $table);
    });
    $('[data-toggle="popover"]').popover({
      container: 'body',
      html:true
    });
    $('[data-toggle="popover"]').on('click', function (e) {
      $('[data-toggle="popover"]').not(this).popover('hide');
    });
  };

  // Renders one panel, assumes data processing has happened
  eventHandler.renderPanels = function(event, $parent) {
    var $panel = $(event.toHtml($('#event-template')));
    $panel.children('.panel').addClass(event.Party);
    $panel.appendTo($parent);
  };

  eventHandler.renderTableWithArray = function (array, $table) {
    array.forEach(function(ele){
      eventHandler.renderTable(ele, $table);
    });
    $('[data-toggle="popover"]').popover({
      container: 'body',
      html:true
    });
    $('[data-toggle="popover"]').on('click', function (e) {
      $('[data-toggle="popover"]').not(this).popover('hide');
    });
  };

  // render table row
  eventHandler.renderTable = function (townhall, $tableid) {
    townhall.dist = Math.round(townhall.dist/1609.344);
    townhall.addressLink = 'https://www.google.com/maps?q=' + escape(townhall.address);
    $($tableid).append(townhall.toHtml($('#table-template')));
  };

  // takes the current set of data in the table and sorts by date
  eventHandler.viewByDate = function (e) {
    e.preventDefault();
    var data = TownHall.isCurrentContext ? TownHall.currentContext:TownHall.allTownHalls;
    var filtereddata = TownHall.filteredResults.length > 0 ? TownHall.filteredResults: data;
    TownHall.currentContext = TownHall.sortDate(filtereddata);
    $table = $('#all-events-table');
    $table.empty();
    eventHandler.renderTableWithArray(TownHall.currentContext, $table );
  };

  // filters the table on click
  eventHandler.filterTable = function (e) {
    e.preventDefault();
    $table = $('#all-events-table');
    $('#resetTable').show();
    var filterID = this.id;
    var filterCol = $(this).attr('data-filter');
    var inputs = $('input[data-filter]');
    $table.empty();
    var data = TownHall.isCurrentContext ? TownHall.currentContext:TownHall.allTownHalls;
    var data = TownHall.filteredResults.length>0 ? TownHall.filteredResults:data;
    if (filterID === 'All') {
      TownHall.filterIds[filterCol] = '';
      eventHandler.renderTableWithArray(data, $table );
      // data.forEach(function(ele){
      //   eventHandler.renderTable(ele, $table);
      // })
    }
    else {
      TownHall.filterIds[filterCol] = filterID;
      Object.keys(TownHall.filterIds).forEach(function(key) {
        if (TownHall.filterIds[key]) {
          data = TownHall.filterByCol(key, TownHall.filterIds[key], data);
        }
      });
      eventHandler.renderTableWithArray(data, $table );
    }
  };

  eventHandler.filterTableByInput = function(e) {
    e.preventDefault();
    $('#resetTable').show();
    $table = $('#all-events-table');
    var query = $(this).val();
    var filterCol = $(this).attr('data-filter');
    $table.empty();
    var data = TownHall.isCurrentContext ? TownHall.currentContext:TownHall.allTownHalls;
    var data = TownHall.filteredResults.length>0 ? TownHall.filteredResults:data;
    Object.keys(TownHall.filterIds).forEach(function(key) {
      if (TownHall.filterIds[key]) {
        data = TownHall.filterByCol(key, TownHall.filterIds[key], data);
      }
    });
    TownHall.filteredResults = TownHall.filterColumnByQuery(filterCol, query, data);
    eventHandler.renderTableWithArray(TownHall.filteredResults, $table);
  };

  eventHandler.resetTable = function (e) {
    e.preventDefault();
    $table = $('#all-events-table');
    $table.empty();
    $('#resetTable').hide();
    TownHall.filterIds = {};
    TownHall.filteredResults = [];
    var data = TownHall.isCurrentContext ? TownHall.currentContext:TownHall.allTownHalls;
    eventHandler.renderTableWithArray(data, $table);
  };


  // renders results of search
  eventHandler.render = function (events, zipQuery) {
    $('[data-toggle="popover"]').popover('hide');
    $('.header-small').removeClass('hidden');
    $('.header-small').fadeIn();
    $('.header-large').hide();
    $('.form-text-results').addClass('text-center');
    $('.left-panels').addClass('left-panels-border');
    $('#nearest').addClass('nearest-with-results');
    $('#look-up').appendTo($('.left-panels'));
    $('#button-to-form').removeClass('hidden');
    $('#button-to-form').fadeIn();
    $('.spacer').hide();
    var $zip = $('#look-up input').val();
    var $parent = $('#nearest');
    var $results = $('#textresults');
    $parent.empty();
    $results.empty();
    var $table = $('#all-events-table');
    var $text = $('<h4>');
    $table.empty();
    maxDist = 80467.2;
    var nearest = events.reduce(function(acc, cur){
      if (cur.dist < maxDist) {
        acc.push(cur);
      }
      return acc;
    },[]);
    $('#map').appendTo('.map-small');
    if (nearest.length === 0) {
      var townHall = events[0];
      var townHalls = [townHall];
      recenterMap(townHalls, zipQuery);
      eventHandler.renderTableWithArray(events, $table);
      $text.text('No events within 50 miles of your zip, the closest one is ' + townHall.dist + ' miles away.');
      $results.append($text);
      TownHall.saveZipLookup($zip);
      eventHandler.renderPanels(townHall, $parent);
    } else {
      TownHall.currentContext = nearest;
      TownHall.isCurrentContext = true;
      recenterMap(nearest, zipQuery);
      if (nearest.length ===1) {
        $text.text('There is ' + nearest.length + ' upcoming events within 50 miles of you.');
      }
      else {
        $text.text('There are ' + nearest.length + ' upcoming events within 50 miles of you.');
      }
      $results.append($text);
      eventHandler.renderTableWithArray(nearest, $table);
      nearest.forEach(function(ele){
        eventHandler.renderPanels(ele, $parent);
      });
    }
    addtocalendar.load();
  };


  // url hash for direct links to subtabs
  // slightly hacky routing
  $(document).ready(function(){
    var filterSelector = $('.filter');
    $('[data-toggle="popover"]').popover({html:true});
    $('#button-to-form').hide();
    $('#save-event').on('submit', eventHandler.save);
    $('#look-up').on('submit', eventHandler.lookup);
    $('#view-all').on('click', TownHall.viewAll);
    $('#sort-date').on('click', eventHandler.viewByDate);
    $('#resetTable').on('click', eventHandler.resetTable);
    $('#resetTable').hide();
    filterSelector.on('click', 'a', eventHandler.filterTable);
    filterSelector.keyup(eventHandler.filterTableByInput);
    if (location.hash) {
      $("a[href='" + location.hash + "']").tab('show');
    }
    else{
      TownHall.isMap = true;
    }
    $('nav').on('click', '.hash-link', function onClickGethref(event) {
      var hashid = this.getAttribute('href');
      if (hashid === '#home' && TownHall.isMap === false) {
        history.replaceState({}, document.title, '.');
        setTimeout( function(){
          onResizeMap();
          if (location.pathname ='/') {
            eventHandler.resetHome();
            TownHall.isMap = true;
          }
        }, 50);
      }
      else if (hashid === '#home' && TownHall.isMap === true) {
        console.log('going home and map');
        history.replaceState({}, document.title, '.');
        eventHandler.resetHome();
      }
      else {
        location.hash = this.getAttribute('href');
      }
      $('[data-toggle="popover"]').popover('hide');
    });
  });

  eventHandler.metaData = function(){
    metaDataObj = new TownHall();
    metaDataObj.topZeroResults = []
    firebase.database().ref('/lastupdatedTesting/time').once('value').then(function(snapshot){
      metaDataObj.time = new Date(snapshot.val())
      metaDataObj.total = TownHall.allTownHallsFB.length
      var topZeros = firebase.database().ref('zipZeroResults/').orderByValue().limitToLast(10);
      topZeros.once('value',function(snapshot){
        console.log(snapshot.val());
        Object.keys(snapshot.val()).forEach(function(key) {
          console.log(key, snapshot.val()[key]);
          metaDataObj.topZeroResults.push ({zip:key , count: snapshot.val()[key]})

        })
      }).then(function(ele){
        $('.metadata').append(metaDataObj.toHtml($('#meta-data-template')));

      })

    })
  }

  eventHandler.readData = function (){
    firebase.database().ref('/townHallsTesting/').on('child_added', function getSnapShot(snapshot) {
      var ele = new TownHall (snapshot.val());
      var id = ele.eventId;
      TownHall.allTownHallsFB.push(ele)
      if (!ele.lat) {
        $('#location-errors').append(ele.toHtml($('#table-template')));
      }
      if (!ele.dateValid) {
        $('#date-errors').append(ele.toHtml($('#table-template')));
      }
      $('#all-events-table').append(ele.toHtml($('#table-template')));
    });
  };

  eventHandler.readData();
  eventHandler.metaData();


  module.eventHandler = eventHandler;
})(window);
