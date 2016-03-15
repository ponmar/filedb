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

        if ($('#personstable').length){
            for (var i=0, person; person = persons[i]; i++) {
                $("#personstable").append('<tr><td>' + person['name'] + '</td><td>' + person['description'] + '</td><td>' + person['dateofbirth'] + '</td><td></td></tr>');
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

        if ($('#locationstable').length){
            for (var i=0, location; location = locations[i]; i++) {
                $("#locationstable").append('<tr><td>' + location['name'] + '</td><td></td></tr>');
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

        if ($('#tagstable').length){
            for (var i=0, tag; tag = tags[i]; i++) {
                $("#tagstable").append('<tr><td>' + tag['name'] + '</td><td></td></tr>');
            }
        }
    });

 });
