<script lang="ts">
import "vue3-loading-skeleton/dist/style.css";
import { SkeletonLoader } from "vue3-loading-skeleton";

export default {
  components: { SkeletonLoader },
};
</script>
<template>
  <div data-v-70bfaedc="">
    <div
      data-v-70bfaedc=""
      class="mdc-card mdc-theme--on-surface mdc-card--outlined"
      style="margin-bottom: 20px"
    >
      <div style="margin: 10px">
        <div class="col-12 card-board">
          <div class="card-header-div">
            <div class="flex-row">
              <div class="card-font-bold flex-left">Manufacturer:</div>
              <div class="card-font-bold flex-left" style="margin-left: 10px">
                <SkeletonLoader height="20px" width="50" pill />
              </div>
              <div class="card-font-bold flex-left" style="margin-left: 10px">
                -> Robot Name:
              </div>
              <div class="card-font-bold flex-left" style="margin-left: 10px">
                <SkeletonLoader height="20px" width="50" pill />
              </div>
            </div>
            <div class="mdc-chip-set flex-right" role="grid">
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-1"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >gps_fixed</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text">
                      x: 0.00, y: 0.00, θ: 0.00</span
                    ></span
                  ></span
                >
              </div>
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-2"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >speed</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text">
                      x: 0.00, x: 0.00, ω: 0.00,
                    </span></span
                  ></span
                >
              </div>
              <div class="mdc-chip" role="row">
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >signal_wifi_0_bar</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text">-</span></span
                  ></span
                >
              </div>
              <div class="mdc-chip" role="row">
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >auto_mode</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text">-</span></span
                  ></span
                >
              </div>
              <div class="mdc-chip" role="row">
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >map</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text">-</span></span
                  ></span
                >
              </div>
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-3"
                style="width: 250px"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >av_timer</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"
                      >0000-00-00T00:00:00.000Z</span
                    ></span
                  ></span
                >
              </div>
            </div>
          </div>
          <div
            class="mdc-divider mdc-divider--horizontal mdc-divider--no-text mb-2 mt-2 card-divider"
          ></div>
          <div class="card-header-div">
            <div class="flex-row">
              <div class="card-font-bold">AGV -&gt; Master Controller</div>
              <div style="margin-left: 20px; display: flex">
                Header :
                <div class="card-font" style="margin-left: 10px">
                  <SkeletonLoader height="20px" width="100" pill />
                </div>
              </div>
            </div>
            <div class="mdc-chip-set" role="grid">
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-7"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >raw_on</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"> State </span></span
                  ></span
                >
              </div>
            </div>
          </div>
          <div class="card-header-div">
            <div class="flex-row">
              Order :
              <div
                style="margin-left: 10px; margin-right: 10px"
                class="card-font"
              >
                <SkeletonLoader height="20px" width="100px" pill />
              </div>
              Update :
              <div
                style="margin-left: 10px; margin-right: 10px"
                class="card-font mal-1"
              >
                <SkeletonLoader height="20px" width="100px" pill />
              </div>
              Last Node Id :
              <div
                style="margin-left: 10px; margin-right: 10px"
                class="card-font mal-1"
              >
                <SkeletonLoader height="20px" width="100" pill />
              </div>
              Last Node Sequence :
              <div
                style="margin-left: 10px; margin-right: 10px"
                class="card-font mal-1"
              >
                <SkeletonLoader height="20px" width="100" pill />
              </div>
            </div>
            <div class="mdc-chip-set flex-right" role="grid">
              <div class="mdc-chip" role="row">
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >stop_circle</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"> Not Driving </span></span
                  ></span
                >
              </div>
              <!--v-if-->
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-10"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >location_on</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"> - </span></span
                  ></span
                >
              </div>
              <div class="mdc-chip" role="row">
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >view_in_ar</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"> Loads : 0</span></span
                  ></span
                >
              </div>
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-11"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >pending_actions</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"> Actions : 0</span></span
                  ></span
                >
              </div>
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-12"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >errors</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"> Errors : 0</span></span
                  ></span
                >
              </div>
            </div>
          </div>
          <!--v-if--><!--v-if--><!--v-if-->
          <div
            class="mdc-divider mdc-divider--horizontal mdc-divider--no-text mb-2 mt-2 card-divider"
          ></div>
          <div class="card-header-div">
            <div class="flex-row">
              <div class="card-font-bold" style="margin-right: 20px">
                Master Controller -&gt; AGV
              </div>
              Header :
              <div class="card-font" style="margin-left: 10px">
                <SkeletonLoader height="20px" width="100" pill />
              </div>
            </div>
            <div class="mdc-chip-set flex-right" role="grid">
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-4"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >raw_on</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"> Order </span></span
                  ></span
                >
              </div>
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-5"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >raw_on</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"> Instant Actions </span></span
                  ></span
                >
              </div>
              <div
                class="mdc-chip mdc-ripple-upgraded"
                role="row"
                id="mdc-chip-6"
              >
                <div class="mdc-chip__ripple"></div>
                <i class="material-icons mdc-chip__icon mdc-chip__icon--leading"
                  >av_timer</i
                ><span role="gridcell"
                  ><span role="button" class="mdc-chip__primary-action"
                    ><span class="mdc-chip__text"
                      >0000-00-00T00:00:00.000Z</span
                    ></span
                  ></span
                >
              </div>
            </div>
          </div>
          <div class="card-header-div">
            <div class="flex-row">
              Order :
              <div
                style="margin-left: 10px; margin-right: 10px"
                class="card-font"
              >
                <SkeletonLoader height="20px" width="100" pill />
              </div>
              Update :
              <div
                style="margin-left: 10px; margin-right: 10px"
                class="card-font mal-1"
              >
                <SkeletonLoader height="20px" width="100" pill />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="mdc-card__primary-action mdc-ripple-upgraded" tabindex="0">
        <div class="mdc-card__ripple"></div>
      </div>
    </div>
  </div>
</template>
<style>
.flex-row {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  row-gap: 7px;
}
</style>




