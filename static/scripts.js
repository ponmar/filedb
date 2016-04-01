var persons = null;
var locations = null;
var tags = null;

 $(document).ready(function(){

    $.getJSON("/persons", function(result){
        persons = result['persons'];

        if ($('#personbuttons').length){
            for (var i=0, person; person = persons[i]; i++){
                var name = person['firstname'] + ' ' + person['lastname'];
                $("#personbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="">' + name + '</label>');
            }
        }

        if ($('#personstable').length){
            for (var i=0, person; person = persons[i]; i++){
                var name = person['firstname'] + ' ' + person['lastname'];
                var dateofbirth = person['dateofbirth'];
                var age = null;
                if (dateofbirth != null){
                    age = getAge(dateofbirth);
                }
                $("#personstable").append('<tr><td>' + person['firstname'] + '</td><td>' + person['lastname'] + '</td><td>' + get_printable_value(person['description']) + '</td><td>' + get_printable_value(age) + '</td><td>' + get_printable_value(person['dateofbirth']) + '</td><td></td></tr>');
            }
        }
    });

    $.getJSON("/locations", function(result){
        locations = result['locations'];

        if ($('#locationbuttons').length){
            for (var i=0, location; location = locations[i]; i++){
                $("#locationbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="">' + location['name'] + '</label>');
            }
        }

        if ($('#locationstable').length){
            for (var i=0, location; location = locations[i]; i++){
                $("#locationstable").append('<tr><td>' + location['name'] + '</td><td></td></tr>');
            }
        }
    });

    $.getJSON("/tags", function(result){
        tags = result['tags'];

        if ($('#tagbuttons').length){
            for (var i=0, tag; tag = tags[i]; i++){
                $("#tagbuttons").append('<label class="checkbox-inline"><input type="checkbox" value="">' + tag['name'] + '</label>');
            }
        }

        if ($('#tagstable').length){
            for (var i=0, tag; tag = tags[i]; i++){
                $("#tagstable").append('<tr><td>' + tag['name'] + '</td><td></td></tr>');
            }
        }
    });

    if ($('#browse_files_button').length){
        $("#browse_files_button").click(function(){
            // TODO: add selected persons, locations and tags to url
            $.getJSON("/files", function(result){
                $("#files").empty();
                files = result['files'];
                for (var i=0, file; file = files[i]; i++){
                    $("#files").append('<a href="/filecontent/' + file['id'] + '">' + file['path'] + '</a><br>');
                }
            });
        });
    }

    if ($('#button_show_all_files').length){
        $("#button_show_all_files").click(function(){
            get_all_files();
        });
    }
});

function get_all_files(){
    $.getJSON("/files", function(result){
        $("#filestable").empty();
        $("#filestable").append('<tr><th>Path</th><th>Description</th><th>Date and Time</th><th>Actions</th></tr>');
        files = result['files'];
        for (var i=0, file; file = files[i]; i++){
            $("#filestable").append('<tr><td><a href="/filecontent/' + file['id'] + '">' + file['path'] + '</a></td><td>' + get_printable_value(file['description']) + '</td><td>' + get_printable_value(file['datetime']) + '</td><td><button type="submit" class="btn btn-default">Delete</button></td></tr>');
        }
    });
}

function get_printable_value(value){
    if (value != null && value != ""){
        return value;
    }
    return 'N/A';
}

function getAge(dateString){
    var today = new Date();
    var birthDate = new Date(dateString);
    var age = today.getFullYear() - birthDate.getFullYear();
    var m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())){
        age--;
    }
    return age;
}
