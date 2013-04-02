/* Utils */
function textToArray(txt){
    return txt.split('\n');
}

/* Backbone MVC */
window.CNode = Backbone.Model.extend({
    defaults:function () {
        return {
            id:"",
            title:"",
            ckeys:"",
            summary:"",
            dependencies:[],
            pointers:[],
            resources:[]
        }
    },
    initialize:function () {
//        _.bindAll(this);
//        _.bind(this,this.setArrayEl);
    },
    urlRoot:window.CONTENT_SERVER + "/nodes"

});

window.CNodeCollection = Backbone.Collection.extend({
    model:CNode,
    url:window.CONTENT_SERVER + "/nodes",
    // parse the incoming json data
    parse:function (response) {
        console.log("in parse collections");
        var ents = [];
        for (key in response.nodes) {
            ents.push(response.nodes[key]);
        }
        return ents;
    },
    comparator:function (node) {
        return node.id.toLowerCase();
    }
});

window.CNodeListView = Backbone.View.extend({
    tagName:'ul',
    className:'nodelist',
    initialize:function () {
        this.model.bind("reset", this.render, this);
    },
    render:function () {
        _.each(this.model.models, function (cnode) {
            $(this.el).append(new CNodeItemView({model:cnode}).render().el);
        }, this);
        return this;
    }
});

window.CNodeItemView = Backbone.View.extend({
    tagName:"li",
    template:_.template($('#cnode-list-item-template').html()),
    initialize:function () {
        this.listenTo(this.model, 'change', this.render);
    },

    render:function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

window.CNodeView = Backbone.View.extend({
    tagName:"div",
    template:_.template($('#cnode-details-template').html()),
    events:{
        "change input":"change",
        "change textarea":"change"
    },
    initialize:function () {
        this.listenTo(this.model, 'change', this.render);
    },
    render:function (eventName) {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },
    change:function (event) {
        // now change the model and have the model post the changes to the server!
        var newVal = $.trim($(event.currentTarget).val());
        var id = this.parseID(event.currentTarget.id)

        // handle the extra resource information separately
	var trgChg = false;
 if (id.length === 1){
     this.model.set(id[0], newVal);
        }
        else if (id.length == 2) {
            this.model.get(id[0])[Number(id[1])] = newVal;
//            directly changing the model so we have to manually trigger the changes
	    trgChg = true;
        }
        else if (id.length === 3) {
	    if (id[2]=='extras'){
		this.model.get(id[0])[id[1]][id[2]] = textToArray(newVal);
	    }
	    else{
		this.model.get(id[0])[id[1]][id[2]] = newVal;
	    }
	    trgChg = true;
        }
	if(trgChg){
            this.model.trigger("change");
            this.model.trigger("change:" + id[0]);
	}
        this.model.save();
    },
    parseID:function (id) {
        return id.split('-')
    }
})
;

// make sure we unbind all listeners/callbacks
Backbone.View.prototype.close = function () {
    if (this.beforeClose) {
        this.beforeClose();
    }
    this.remove();
    this.unbind();
};

var AppRouter = Backbone.Router.extend({
    routes:{
        "":"list",
        "cnode/:id":"cnodeDetails"
    },

    showView:function (selector, view) {
        if (this.currentView) {
            this.currentView.close();
        }
        $(selector).html(view.render().el);
        this.currentView = view;
        return view;
    },

    list:function (first_node) {
        console.log('in list');
        this.cnodeList = new CNodeCollection();
        this.cnodeListView = new CNodeListView({model:this.cnodeList});
        var that = this;
        this.cnodeList.fetch({success:function () {
            console.log('successful fetch'); //  (collection have been populated)
            if (first_node) {
                that.cnodeDetails(first_node);
            }
        }}, this);
        $("#rightpanel").html(this.cnodeListView.render().el);
    },

    cnodeDetails:function (id) {
        if (!this.cnodeList) {
            this.list(id);
        } else {
            this.cnodeItem = this.cnodeList.get(id);

            this.cnodeView = new CNodeView({model:this.cnodeItem}); // careful of memory management with callbacks...
            this.showView("#leftpanel", this.cnodeView)
        }

    }
});

// main function... TODO move somewhere
var app = new AppRouter();
Backbone.history.start();
