.PHONY: clean cleandist test vars build_production remove_sensitive_data

# obtain the absolute path to metacademy-application
MAKEFILE_DIR := $(dir $(lastword $(MAKEFILE_LIST)))
MAKEFILE_DIR := $(realpath $(MAKEFILE_DIR))

# assumes the base project directory is the parent of metacademy-application
BASE_DIR := $(realpath $(MAKEFILE_DIR)/..)

# custom vars: define containing directory for local database directories
LOCAL_DBS_DIR = $(BASE_DIR)/local_dbs
# custom vars: define names of local database directories
DJANGO_DB_DIR = django_db
APP_INDEX_DIR = app_index
# virtual environment directory location
VENV = $(BASE_DIR)/meta_venv
VENV_ACTIVATE = $(VENV)/bin/activate

# derived vars
LOCAL_DBS = $(LOCAL_DBS_DIR)/$(DJANGO_DB_DIR) $(LOCAL_DBS_DIR)/$(APP_INDEX_DIR)
DJANGO_DB_FILE := $(LOCAL_DBS_DIR)/$(DJANGO_DB_DIR)/django_db.sqlite

$(DJANGO_DB_FILE): config.py server/settings_local.py $VENV $(LOCAL_DBS) | server/static/lib/kmap/* python_path
	. $(VENV_ACTIVATE); python server/manage.py syncdb --noinput
	. $(VENV_ACTIVATE); python server/manage.py migrate

server/static/lib/kmap/*:
	git clone https://github.com/cjrd/kmap.git server/static/lib/kmap

test: $(VENV_ACTIVATE) | node_modules/mocha-phantomjs server/settings_local.py config.py python_path
	./Tests.sh

config.py:
	cp config-template.py config.py

server/settings_local.py:
	cp server/settings_local-template.py server/settings_local.py

# append the meta-app path to the virtual env PYTHONPATH
python_path: |$VENV
	echo 'export PYTHONPATH=$(MAKEFILE_DIR):$(PYTHONPATH)' >> $(VENV_ACTIVATE)

$VENV: $(VENV_ACTIVATE)

$(VENV_ACTIVATE): requirements.txt
	test -d $(VENV) || virtualenv $(VENV)
	. $(VENV_ACTIVATE); pip install -r requirements.txt
	touch $(VENV_ACTIVATE)

$(LOCAL_DBS): |$(LOCAL_DBS_DIR)
	mkdir $(LOCAL_DBS)

$(LOCAL_DBS_DIR):
	mkdir $(LOCAL_DBS_DIR)

node_modules/mocha-phantomjs: node_modules/phantomjs
	npm install mocha-phantomjs

node_modules/phantomjs:
	npm install phantomjs

# TODO get confirmation from user
cleandist:
	-rm -r $(VENV)
	-rm -r $(LOCAL_DBS)
	-rm -r $(LOCAL_DBS_DIR)

clean:
	find . -name "*.pyc" -print0 | xargs -0 rm -rf

build_production:
	cd server/static/javascript; node lib/r.js -o build.js
	$(VENV); python server/manage.py collectstatic --noinput

update_db:
	python server/manage.py schemamigration apps.graph --auto
	python server/manage.py migrate
	python server/manage.py dumpdata > server/apps/graph/fixtures/graph_fixture.json

update:
	git pull
	cd server/static/lib/kmap; git pull

remove_sensitive_data:
	python server/manage.py remove_provisional_concepts
	python server/manage.py remove_user_accounts
	python server/manage.py remove_provisional_roadmaps
	python server/manage.py clearsessions
	./dev_utils/remove_sensitive_aux_data_from_db.sh

# print the vars used in the makefile
vars:
	$(info BASE_DIR has the value $(BASE_DIR))
	$(info MAKEFILE_DIR has the value $(MAKEFILE_DIR))
	$(info VENV has the value $(VENV))
	$(info VENV_ACTIVATE has the value $(VENV_ACTIVATE))
	$(info LOCAL_DBS has the value $(LOCAL_DBS))
	$(info LOCAL_DBS_DIR has the value $(LOCAL_DBS_DIR))
	$(info DJANGO_DB_FILE has the value $(DJANGO_DB_FILE))

