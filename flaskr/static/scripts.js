var persons = null;
var locations = null;
var tags = null;

 $(document).ready(function(){

    $.getJSON("/persons", function(result){
        persons = result['persons'];
        if ($('#personbuttons').length){
            for (var i=0, person; person = persons[i]; i++) {
               $("#personbuttons").append('<button type="button" class="btn btn-default">' + person['name'] + '</button>');
            }
        }
    });

    $.getJSON("/locations", function(result){
        locations = result['locations'];
        if ($('#locationbuttons').length){
            for (var i=0, location; location = locations[i]; i++) {
               $("#locationbuttons").append('<button type="button" class="btn btn-default">' + location['name'] + '</button>');
            }
        }
    });

    $.getJSON("/tags", function(result){
        tags = result['tags'];
        if ($('#tagbuttons').length){
            for (var i=0, tag; tag = tags[i]; i++) {
               $("#tagbuttons").append('<button type="button" class="btn btn-default">' + tag['name'] + '</button>');
            }
        }
    });

 });
